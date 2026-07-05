---
doc: Redesign da Jornada do Candidato
date: 2026-07-05
method: 3 segmentos Fable (walkthrough tela-a-tela + mockups ASCII) -> assembler
source: aprofundamento da lente 'candidato' de .planning/M4-PRODUCT-EVALUATION.md
feeds: M5-DRAFT.md (COMM/OPER) + M4-C (drift M1->M2)
---

# Redesign da Jornada do Candidato — Beauty Smile ATS

## Abertura

O sistema atual foi construído para um candidato que não existe: alguém em um desktop, com uma hora livre, motivação constante e memória perfeita do que estava fazendo. O candidato real da Beauty Smile — a ASB ou recepcionista no celular, no intervalo do trabalho atual, com 4G instável, interrompida por uma ligação no meio do Big Five — perde tudo a cada interrupção, não sabe com quem está a bola, recebe promessas de e-mails que nunca chegam e botões que não fazem nada. Este redesign inverte a premissa: cada tela passa a assumir **interrupção como norma** (rascunho e retomada em toda superfície de digitação), **ansiedade como estado padrão** (timeline, prazos típicos e "última movimentação" em toda espera) e **intenção como ativo frágil** (a vaga escolhida acompanha o candidato do clique em "Candidatar-se" até o envio do formulário). O objetivo não é embelezar telas — é fazer o candidato real chegar ao fim, preservando os invariantes do produto: RNF-07a (IA recomenda, humano decide; candidato nunca vê score/banda; único auto-reject é o knockout determinístico da etapa 1), linguagem "avaliação comportamental/cognitiva" e LGPD Art. 20 (explicação + revisão por pessoa natural).

---

## Mapa de fluxo unificado

⚠️ = ponto de desistência · ✓ = momento de confiança já existente (preservar)

```
DESCOBERTA ─────────────────────────────────────────────────────────────
 Landing (/)          /vagas                /vagas/:slug
 ⚠️ fala do software  ⚠️ 1º card abaixo     ✓ share + 404 digno
 ⚠️ "Área do RH"      da dobra              ✓ CTA sticky mobile
 divide o clique      ⚠️ "N candidatos"     ⚠️ toast.error p/ anônimo
        │             público               ⚠️ custo escondido (conta+CV)
        └──────────────────┴───────────────────────┐
                                                   ▼
INSCRIÇÃO ──────────────────────────────  [tem conta?]
                          ┌── não ──► Cadastro (4 steps)
                          │           ⚠️ redirect perdido · ⚠️ endereço
                          │           completo no pico de motivação
                          └── sim ──► Login
                                      ⚠️ botão eterno-disabled (onBlur)
                                                   │
              Formulário de candidatura ◄──────────┘
              ✓ submit atômico + erros exemplares
              ⚠️ SEM rascunho/leave-guard (perda total no back-gesture)
              ⚠️ CV-PDF como gate mudo
                     │
        ┌────────────┴─────────────┐
   knockout (etapa 1)         sobrevivente
   ✓ copy D-15 digna          ⚠️ toast + redirect seco
   ⚠️ beco sem "ver vagas"    (sem "o que acontece agora")
        └────────────┬─────────────┘
                     ▼
ESPERA ─────── Dashboard (a sala de espera) ────────────────────────────
               ⚠️ 6 tiles mortos + "Rejeitadas" vermelho permanente
               ⚠️ botão-fantasma no-op · ⚠️ sem timeline nem prazo
               ⚠️ e-mail prometido nunca chega (painel = canal único)
                     │ RH avança
                     ▼
AVALIAÇÕES ─── Hub de avaliações ⚠️ cards eternos "Pendente"
               ├► SJT MC        ⚠️ zero persistência (perda total)
               ├► Caso aberto   ⚠️ spinner IA 38-102s · restore nunca roda
               ├► Big Five      ✓ intro exemplar ⚠️ fadiga ~item 70 s/ retomada
               │    └► Devolutiva 🎁 ⚠️ "volte depois" sem polling
               ├► Redação       ⚠️ "revisar" prometido e inexistente
               └► Cognitivo     ⚠️ INALCANÇÁVEL (nenhum clique leva)
                     │
               Espera de novo (~90% do tempo de calendário)
                     ▼
ENTREVISTA ─── ⚠️ sem superfície nenhuma — data/link/preparo via WhatsApp
                     ▼
DECISÃO ────┌────────┴─────────┐
        Rejeição            Aprovação
        ✓ ExplicacaoPage    ⚠️ silêncio absoluto: badge
        digna (quando abre) "Aguardando Resposta" no
        ⚠️ gate LGPD        momento mais feliz do funil
        INVERTIDO           ⚠️ "Entenda a decisão" →
        ⚠️ CTA "Continuar   "página não disponível"
        para Rejeitado"
        ⚠️ revisão Art.20 = loop sem volta (sem write-path)
```

---

## Segmento 1 — Descoberta & Inscrição: walkthrough tela-a-tela

**Escopo:** `/` → `/vagas` → `/vagas/:slug` → `/auth/login` → `/cadastro` → `/candidato/dashboard` → `/candidato/candidatura/instrucoes` → `/candidato/candidatura/formulario/:slug` → knockout etapa 1.

**Lente:** candidata típica = ASB/recepção, no celular, no intervalo do trabalho atual, com 4G instável. Cada tela é avaliada por "o que ela faz com a motivação dessa pessoa". A avaliação de produto já cobriu a linguagem proibida da landing, o redirect perdido no cadastro, os 4 steps pré-candidatura e a instruções órfã — aqui esses achados são **estendidos** com profundidade de tela e redesenho visual de cada uma.

### 1.1 — Landing (`/`)

**Rota + arquivo:** `/` → `src/components/pages/LandingPage.tsx` (98 linhas, a menor página do sistema).

**O que o candidato vê hoje:** um hero glass centrado com logo, `h1 text-6xl` "Beauty Smile", subtítulo "Sistema de Recrutamento Inteligente", e dois botões **lado a lado com o mesmo peso visual**: "Ver Vagas" e "Área do RH" (`LandingPage.tsx:28-45`). Abaixo, seção "Como Funciona" com 3 cards: "Questionários — Testes psicométricos com design moderno e tecnológico" (`:65`), "Vagas", e "Resultados — Acompanhe seu progresso e análise de perfil" (`:88-90`). Não há navbar, não há preview de vagas, não há entrada de login para quem já é candidato.

**Momento emocional:** é o primeiro contato — a pessoa chegou por um link no Instagram ou WhatsApp ("a Beauty Smile tá contratando"). Ela quer responder duas perguntas em 5 segundos: *"tem vaga pra mim?"* e *"esse lugar é confiável?"*. Em vez disso, recebe o nome do **software** ("Sistema de Recrutamento Inteligente") — copy voltada para quem comprou o sistema, não para quem procura emprego.

**Fricções e furos (além do que a avaliação já apontou):**
- **A página fala do sistema, não do trabalho.** Nenhuma menção aos cargos reais (Dentista, ASB, TSB, Recepção), à clínica, a benefícios ou a "por que trabalhar aqui". Os 3 cards descrevem *features do ATS* — a persona candidata não tem por que se importar com "design moderno e tecnológico" dos questionários.
- **Escala tipográfica desktop no mobile:** `text-6xl` no h1 e `text-2xl` no subtítulo (`:24-26`) estouram a viewport de 360px; os dois CTAs em `flex gap-4` sem `flex-wrap` ficam apertados lado a lado.
- **"Área do RH" divide o clique da persona majoritária** (`:41-44`) e não existe "Já sou candidato" — quem volta para acompanhar precisa adivinhar que o caminho é Ver Vagas → navbar → Área do candidato (que só aparece logado).
- **Zero prova de custo/processo:** nada diz quanto tempo leva a inscrição nem que existe resposta garantida — os dois maiores redutores de desistência pré-clique.
- Linguagem proibida ("Testes psicométricos", `:65`) e promessa que viola RNF-07a ("análise de perfil", `:89`) — **já apontadas na avaliação**; registro apenas que ambas estão na página de maior alcance público do sistema.

**Redesenho proposto** (mobile ~360px, glass Beauty Smile):

```
┌──────────────────────────────────────┐
│ ◇ Beauty Smile              Entrar → │
│──────────────────────────────────────│
│                                      │
│   Venha cuidar de sorrisos           │
│   com a gente                        │
│                                      │
│   Vagas para Dentista, ASB, TSB      │
│   e Recepção — CLT e PJ              │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │      Ver vagas abertas (4)   →   │ │
│ └──────────────────────────────────┘ │
│   Já se candidatou?                  │
│   Acompanhar minha candidatura →     │
│                                      │
│ ╭─ Como funciona ─────────────────╮  │
│ │ 1  Inscrição online (~15 min)   │  │
│ │ 2  Avaliação comportamental     │  │
│ │    e situacional                │  │
│ │ 3  Entrevista com nossa equipe  │  │
│ │ 4  Resposta no seu painel,      │  │
│ │    em qualquer resultado        │  │
│ ╰─────────────────────────────────╯  │
│                                      │
│  "Transformamos vidas através        │
│   do sorriso" — Beauty Smile         │
│                                      │
│──────────────────────────────────────│
│ Política de privacidade · Acesso RH  │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- Hero orientado a emprego, com **contagem real de vagas no CTA** (o dado já existe — `useVagas` retorna `pagination.total`).
- "Entrar" no topo (→ `/auth/login`) e link secundário "Acompanhar minha candidatura"; **"Acesso RH" desce para o rodapé**.
- "Como funciona" vira os **4 passos do processo do candidato** com expectativa de tempo e a promessa central do produto ("resposta no seu painel, em qualquer resultado") — que é exatamente o que o funil M2 + LGPD Art. 20 entregam.
- Corrigir a linguagem: "avaliação comportamental e situacional" (nunca "psicométrico"); remover "análise de perfil".

### 1.2 — Lista de vagas (`/vagas`)

**Rota + arquivo:** `/vagas` → `src/components/pages/VagasPublicasPage.tsx`.

**O que o candidato vê hoje:** navbar do candidato (nula para anônimo), logo `xl` + `h1 text-5xl` "Vagas Disponíveis" + contador. Depois **um painel de filtros sempre expandido**: busca + 4 selects (tipo CLT/PJ, modelo de trabalho, departamento com 9 opções, ordenação) + linha de resultados (`:208-343`). Só então os cards de vaga: título `text-3xl`, cidade, departamento, modelo, descrição em `line-clamp-3` dentro de um sub-glass, "Publicada há N dias", **"N candidatos"** (`:433-437`), e um botão full-width "Candidatar-se a esta vaga →" que na prática só navega para o detalhe (`handleCandidatar` = `handleVerDetalhes`, `:141-147`). Paginação 12/página.

**Momento emocional:** exploração otimista — "será que tem algo pro meu cargo?". A pessoa quer **escanear**, não configurar filtros. Com poucas vagas simultâneas (clínica, não marketplace), qualquer coisa entre o título da página e o primeiro card é custo puro.

**Fricções e furos:**
- **No mobile, a primeira vaga entra abaixo da dobra:** logo xl + h1 gigante + painel com 5 controles empilhados ocupam ~2 telas antes do primeiro card. Para um inventário de 2-6 vagas, 4 dropdowns + ordenação é maquinário de marketplace sem propósito.
- **Filtro por "departamento" com 9 enums internos** (`:65-75`: "tecnologia", "financeiro"...) em vez do vocabulário do candidato — **cargo** (Dentista / ASB / TSB / Recepção). A candidata ASB não sabe se é "clínico" ou "atendimento".
- **`isFilterSidebarOpen`/`toggleFilterSidebar` são destruturados da store e nunca usados** (`:99-100`) — o colapso de filtros foi planejado e não cabeado.
- **"N candidatos" público** (`:433-437`) — ver "23 candidatos" numa vaga de recepção é pressão social que desencoraja exatamente os perfis mais inseguros; nenhum benefício para o candidato.
- **Card inteiro clicável + botão "Candidatar-se" que não candidata** — duas affordances para a mesma navegação; o botão promete uma ação que não acontece (a candidatura real está a 2+ telas de distância).
- **Navegação por UUID:** `handleVerDetalhes` usa `vaga.id` (`:142`) — a URL compartilhada no WhatsApp vira `/vagas/3f9a...` em vez do slug legível que o schema já tem (o detalhe já aceita ambos via `isUuid`).
- **Sem salário/faixa no card** — a informação nº 1 de decisão para as personas de clínica não aparece em nenhum nível (o schema de vagas também não a projeta para o público; furo de produto, não só de UI).

**Redesenho proposto:**

```
┌──────────────────────────────────────┐
│ ◇ Beauty Smile          Entrar →     │
│──────────────────────────────────────│
│  Vagas abertas (4)                   │
│                                      │
│  ┌ 🔍 Buscar vaga…      ┐ [Filtros ▾]│
│  └──────────────────────┘            │
│  (Dentista) (ASB) (TSB) (Recepção)   │
│   chips de cargo — 1 toque           │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │ Auxiliar de Saúde Bucal (ASB)    │ │
│ │ 📍 Curitiba · Presencial · CLT   │ │
│ │ 💰 R$ 2.100 + benefícios         │ │
│ │ Publicada há 3 dias              │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │        Ver vaga  →           │ │ │
│ │ └──────────────────────────────┘ │ │
│ ╰──────────────────────────────────╯ │
│ ╭──────────────────────────────────╮ │
│ │ Recepcionista de Clínica         │ │
│ │ 📍 Curitiba · Presencial · CLT   │ │
│ │ ✓ Você já se candidatou          │ │
│ │        Acompanhar  →             │ │
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Chips de cargo** como filtro primário (derivado de `vagas.cargo`/template — o dado existe em `cargoTemplates`); os 4 selects colapsam para dentro de "Filtros ▾" (cabear o `toggleFilterSidebar` que já existe na store).
- Botão do card vira **"Ver vaga →"** (o que ele realmente faz); em vaga já aplicada, vira "Acompanhar →" para o dashboard.
- **Remover "N candidatos"** da superfície pública; manter "Publicada há N dias".
- Navegar por **slug** (`navigate(\`/vagas/${vaga.slug}\`)`).
- Reduzir hero (logo `md`, h1 `text-2xl`) para colocar o primeiro card acima da dobra.

### 1.3 — Detalhe da vaga (`/vagas/:identifier`)

**Rota + arquivo:** `/vagas/:identifier` (slug ou UUID) → `src/components/pages/VagaDetalhePage.tsx`.

**O que o candidato vê hoje:** breadcrumb "Voltar para vagas", título + meta (local, departamento, modelo), botão share (WhatsApp/e-mail/copiar — com tratamento correto de clipboard, `:160-172`), seções condicionais Sobre a vaga / Responsabilidades / Requisitos (4 campos string com `<strong>Formação:</strong>` inline) / Diferenciais / Benefícios, painel "Publicada há / N candidatos" (`:448-460`), e **CTA sticky no rodapé** "Candidatar-se a esta vaga" (`:468-491`). Anônimo que clica no CTA recebe `toast.error('Você precisa estar logado')` (`:117`) e vai para `/auth/login?redirect=<formulário>`. O 404 anti-enumeração é digno e com CTA de retorno (`VagaNotFoundState`, `:55-86`).

**Momento emocional:** é o **pico de motivação de toda a jornada** — a pessoa achou a vaga certa e decidiu agir. Tudo que acontece a partir do clique em "Candidatar-se" é gasto do capital emocional acumulado aqui. E é exatamente aqui que o sistema responde com um **toast vermelho de erro** por ela não ter conta — punição visual por um estado completamente normal.

**Fricções e furos:**
- **`toast.error` para anônimo** (`:117-120`): a gramática de erro (vermelho, "Você precisa estar logado") transforma o momento de decisão em repreensão. Não é erro — é o próximo passo esperado do fluxo.
- **Expectativa zero sobre o que vem depois do clique:** nada informa que será preciso criar conta (4 etapas), anexar currículo em PDF e responder perguntas. O custo escondido detona a taxa de conclusão — a pessoa clica achando que é 1 passo e descobre uma escadaria.
- **Nenhuma descrição do processo seletivo** na página da vaga (etapas, prazo típico de resposta) — a vaga vende o cargo mas não vende o processo, que é o diferencial real do produto.
- **"N candidatos" de novo** (`:448-460`), agora com ícone e destaque.
- O sticky CTA é excelente para mobile — manter.

**Redesenho proposto** (parte inferior da página + fluxo do clique):

```
┌──────────────────────────────────────┐
│ ← Vagas          [↗ Compartilhar]    │
│                                      │
│  Auxiliar de Saúde Bucal (ASB)       │
│  📍 Curitiba · Presencial · CLT      │
│                                      │
│  Sobre a vaga …                      │
│  Responsabilidades …                 │
│  Requisitos …                        │
│  Benefícios …                        │
│                                      │
│ ╭─ Como é o nosso processo ────────╮ │
│ │ ① Inscrição — ~15 min, online    │ │
│ │ ② Avaliação comportamental       │ │
│ │ ③ Entrevista (online/presencial) │ │
│ │ ④ Resposta no seu painel         │ │
│ │ Você acompanha tudo por aqui.    │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃   Quero me candidatar  →         ┃ │
│ ┃   Leva cerca de 15 minutos       ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│  Tenha em mãos: seu currículo (PDF)  │
└──────────────────────────────────────┘

Clique anônimo →  (sem toast de erro)
┌──────────────────────────────────────┐
│  Quase lá!                           │
│  Para se candidatar, crie sua conta  │
│  ou entre — sua vaga fica guardada.  │
│ ┌──────────────────────────────────┐ │
│ │  Criar conta e continuar  →      │ │
│ └──────────────────────────────────┘ │
│    Já tenho conta — entrar           │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Trocar `toast.error` por um interstitial/bottom-sheet neutro** com dois caminhos, ambos carregando `?redirect=` (o guard anti-open-redirect de `resolveRedirect` já existe): "Criar conta e continuar" → `/cadastro?redirect=…` e "Entrar" → `/auth/login?redirect=…`. Isso resolve na origem o furo do redirect perdido (a avaliação o ataca no link do login; aqui é o lugar certo de bifurcar).
- Bloco "Como é o nosso processo" reutilizável (mesmo componente da landing).
- Sub-copy no CTA sticky: **tempo estimado + o que ter em mãos** (currículo PDF) — mata a surpresa do formulário.
- Remover contagem pública de candidatos.

### 1.4 — Login do candidato (`/auth/login`)

**Rota + arquivo:** `/auth/login` → `src/components/pages/LoginCandidatoPage.tsx`.

**O que o candidato vê hoje:** card glass `max-w-md` com e-mail, senha (toggle mostrar), "Lembrar-me" default true, "Esqueci minha senha", botão "Entrar" **desabilitado até o form ser válido** (`disabled={isSubmitting || !isValid || isInCooldown}`, `:399`, com `mode: 'onBlur'`, `:101`), blocos amber para e-mail não confirmado (com reenviar) e rate-limit com countdown. No rodapé, "Não tem uma conta? **Criar conta →**" que faz `navigate('/cadastro')` seco (`:492`).

**Momento emocional:** para quem **já tem conta**, é um pedágio ok. Para o candidato **novo vindo da vaga** (o caso majoritário do topo de funil), esta tela é um desvio inesperado: ele clicou "Candidatar-se" e recebeu uma tela de *login* cuja ação primária não é para ele — o caminho dele é um link pequeno no rodapé.

**Fricções e furos:**
- **Botão eterno-disabled:** `!isValid` + `onBlur` significa que preencher os dois campos e tocar direto em "Entrar" encontra o botão desabilitado sem nenhuma explicação (o mesmo padrão que quebrou o E2E da Phase 17 — não é hipótese, está documentado). No touch, blur é imprevisível. Item nº 5 do shortlist da avaliação; reforço: é a fricção de maior frequência da tela.
- **Hierarquia invertida para o contexto:** vindo com `?redirect=` de uma vaga, a persona provável é "primeira vez" — mas "Criar conta" é um text-link `text-sm` no rodapé, fora do card.
- **O link "Criar conta" descarta o `?redirect=`** (`:492`) — já flagrado pela avaliação; o mockup abaixo assume a correção.
- Não há headline de contexto: quando há `redirect` de vaga, a tela poderia dizer *para que* o login serve ("para continuar sua candidatura de ASB").

**Redesenho proposto:**

```
┌──────────────────────────────────────┐
│            ◇ Beauty Smile            │
│                                      │
│  Continue sua candidatura            │
│  Vaga: Auxiliar de Saúde Bucal       │
│         (quando há ?redirect)        │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │ Primeira vez aqui?               │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │  Criar minha conta  →        │ │ │
│ │ └──────────────────────────────┘ │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│  ── ou entre com sua conta ──        │
│                                      │
│  Email                               │
│  ┌──────────────────────────────┐    │
│  │ seu@email.com                │    │
│  └──────────────────────────────┘    │
│  Senha                    [👁]       │
│  ┌──────────────────────────────┐    │
│  │ ••••••••                     │    │
│  └──────────────────────────────┘    │
│  ☑ Lembrar-me    Esqueci a senha     │
│ ┌──────────────────────────────────┐ │
│ │         Entrar  →                │ │
│ └──────────────────────────────────┘ │
│   (sempre habilitado; valida no      │
│    submit e foca o campo com erro)   │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Remover `!isValid` do `disabled`** — deixar o submit disparar a validação e focar o primeiro erro (padrão que o RHF já suporta). Manter disabled apenas para `isSubmitting || isInCooldown`.
- Quando `?redirect` presente e aponta para formulário de vaga: headline "Continue sua candidatura" + nome da vaga (resolvível pelo slug do próprio redirect) — reancora a intenção.
- **Bloco "Primeira vez aqui?" acima do form** quando há redirect (persona novo domina); link propaga `?redirect=` para `/cadastro`.

### 1.5 — Cadastro (`/cadastro`)

**Rota + arquivo:** `/cadastro` → `src/components/pages/CadastroPage.tsx` (wrapper) + `src/features/cadastro/components/CadastroMultiStepForm.tsx`.

**O que o candidato vê hoje:** form multi-step com 4 etapas (`FORM_STEPS`, `CadastroMultiStepForm.tsx:82-111`): **Dados Pessoais** (nome, e-mail, telefone, data de nascimento, Instagram, LinkedIn, como conheceu, senha + confirmar senha), **Endereço** (CEP com ViaCEP, logradouro, número, complemento, bairro, cidade, estado), **Disponibilidade** (turno, modelo), **Autorizações LGPD**. Tem progresso "Etapa N de 4", rascunho com restauração ("Retomamos seu cadastro de onde você parou" + "Começar do zero", `:257-266`), leave-guard, e roteamento de erro servidor→step/campo. No sucesso: `navigate('/candidato/dashboard')` (`:447`). O wrapper ainda grava `candidatura_vaga_id` no localStorage que ninguém lê (`CadastroPage.tsx:32`).

**Momento emocional:** a pessoa está pagando adiantado. Cada campo é um "isso é mesmo necessário?" silencioso — e ela ainda **não fez nada relacionado à vaga**. No celular, o step Endereço (6 campos + CEP) é o pior trecho: teclado numérico↔alfabético alternando, autocomplete brigando com máscara.

**Fricções e furos (estendendo a avaliação, que já cobriu o redirect perdido e o excesso de steps):**
- **Nenhum contexto da vaga durante o cadastro:** mesmo quando a pessoa veio de uma vaga, o form não mostra "você está se candidatando a X" — 5-8 minutos sem reforço da intenção é onde a motivação evapora. O mecanismo existia (`vagaId`→localStorage) e morreu órfão.
- **Instagram/LinkedIn no step 1:** opcionais, mas posicionados antes da senha, com validação de formato estrita (`candidatoSchema.ts:80-117`) que gera erro em quem digita "meuuser" sem `@` — fricção de validação em campos que nem deveriam estar no caminho crítico de uma ASB.
- **"Confirmar senha" no mobile** (`:172-176`): digitação dupla de senha forte em teclado de celular; com o toggle "mostrar senha" já presente no login, o campo de confirmação é custo sem benefício.
- **Pós-cadastro pode exigir confirmação de e-mail** (`:450`: fallback navega para login com e-mail preenchido): no pior caso a pessoa sai do app, abre o Gmail, volta — e aí o login não sabe mais da vaga (redirect já perdido). A cadeia de perda de intenção tem três elos, não um.
- **Sucesso cai num dashboard vazio** ("Você ainda não se candidatou") — anticlímax documentado na avaliação; o mockup abaixo fecha o loop.

**Redesenho proposto** (2 steps + contexto persistente):

```
┌──────────────────────────────────────┐
│ ◇ Beauty Smile                       │
│ ╭──────────────────────────────────╮ │
│ │ ► Candidatura: ASB — Curitiba    │ │
│ │   Falta pouco: conta → formulário│ │
│ ╰──────────────────────────────────╯ │
│  Criar conta        Etapa 1 de 2     │
│  ●━━━━━━━━━━○                        │
│                                      │
│  Nome completo *                     │
│  ┌──────────────────────────────┐    │
│  Email *                             │
│  ┌──────────────────────────────┐    │
│  Celular (WhatsApp) *                │
│  ┌──────────────────────────────┐    │
│  Data de nascimento *                │
│  ┌──────────────────────────────┐    │
│  Senha *                   [👁]      │
│  ┌──────────────────────────────┐    │
│  ▸ mín. 8 caracteres, 1 número       │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │        Continuar  →              │ │
│ └──────────────────────────────────┘ │
│  Rascunho salvo automaticamente ✓    │
└──────────────────────────────────────┘

 Etapa 2 = Autorizações LGPD (checkbox
 + link da política) → cria conta →
 navega DIRETO ao redirect (formulário
 da vaga), não ao dashboard.
```

**Mudanças de fluxo/copy/estado:**
- **2 steps:** Dados essenciais (nome, e-mail, celular, nascimento, senha única com toggle) + LGPD. **Endereço e Disponibilidade migram** para o pós-candidatura ("completar perfil") ou para o formulário da vaga quando o cargo exigir — o knockout da etapa 1 não usa nenhum dos dois (server-side usa só perguntas `tag='knockout'`).
- **Banner de contexto da vaga** fixo no topo quando há `?redirect=` — reforço contínuo da intenção + senso de progresso na jornada maior ("conta → formulário").
- Remover "confirmar senha"; validação de senha como checklist inline (não erro pós-blur).
- Instagram/LinkedIn e "como conheceu" → step opcional pós-candidatura.
- Pós-sucesso: `navigate(redirect ?? '/candidato/dashboard')`; apagar o mecanismo morto `candidatura_vaga_id` (`CadastroPage.tsx:30-34`).

### 1.6 — Dashboard do candidato (`/candidato/dashboard`) — visão de chegada

> Esta tela reaparece em **3.1** como "sala de espera" — aqui o foco é o primeiro contato pós-inscrição; lá, a operação da espera (timeline, última movimentação, prazos).

**Rota + arquivo:** `/candidato/dashboard` → `src/components/pages/DashboardCandidatoPage.tsx`.

**O que o candidato vê hoje:** topbar própria (avatar + nome + Sair — shell diferente do `CandidatoNavbar` das outras telas), logo `xl` + `h1 text-5xl` "Dashboard de Candidato", painel "Suas Candidaturas" com **6 tiles de estatística** (Total / Aguardando / Em Análise / Aprovadas / Rejeitadas em vermelho / Finalizadas, `:192-217`), 6 chips de filtro por status (`:234-257`), e os cards de candidatura: título da vaga, departamento, data, "Etapa atual: X" como linha de texto (`:332-344`), badge de status (vermelho "Rejeitado", `:74-75`), bloco "Próximo passo" com CTA turquesa (ou botão neutro **morto** quando `destino === null`, `:383-397`) e card LGPD quando há decisão final.

**Momento emocional:** este é o lugar para onde a pessoa volta — muitas vezes por semanas — para responder uma única pergunta: *"e aí, como estou?"*. Para alguém com **1 candidatura** (o caso típico), a tela responde com 6 números agregados (cinco deles "0"), 6 filtros e um vocabulário de BI ("Dashboard", "Em Análise") — a gramática de um painel de RH aplicada a uma pessoa ansiosa.

**Fricções e furos (estendendo os achados "botão morto", "contadores M1 congelados" e "vermelho na rejeição" da avaliação):**
- **As estatísticas são anti-persona:** contam `status` M1 que o funil M2 nem escreve (Em Análise/Aprovadas ficam 0 para sempre) e, pior, exibem um contador **"Rejeitadas" em vermelho permanente** no topo da tela mais revisitada da jornada. Para 1-2 candidaturas, tiles agregados não têm função nenhuma.
- **Sem linha do tempo:** "Etapa atual: Triagem" sem mostrar quantas etapas existem, quais já passaram e o que vem depois — a informação que reduziria a ansiedade de espera custa uma linha de dados que o `funilNavMap` já tem (8 etapas tipadas).
- **Sem expectativa de prazo:** nenhuma superfície diz "normalmente respondemos em até N dias" — e como não há e-mail transacional (achado central da avaliação), o painel é o **único** canal; ele precisa carregar a expectativa sozinho.
- **Shell divergente:** topbar caseira aqui vs `CandidatoNavbar` em /vagas, detalhe e formulário (a avaliação já pediu unificação; noto que é justamente na tela mais usada que ela falta).
- `h1 text-5xl` "Dashboard de Candidato" — jargão de software; a tela é "Minhas candidaturas".

**Redesenho proposto:**

```
┌──────────────────────────────────────┐
│ ◇ Beauty Smile        Olá, Ana  [⎋] │
│──────────────────────────────────────│
│  Minhas candidaturas                 │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │ Auxiliar de Saúde Bucal (ASB)    │ │
│ │ Inscrita em 12 jun               │ │
│ │                                  │ │
│ │ Inscrição  Triagem  Avaliação    │ │
│ │    ✓━━━━━━━━●━━━━━━━━○━━━━━○━━○  │ │
│ │            você está aqui        │ │
│ │                                  │ │
│ │ ╭ Em análise pela nossa equipe ╮ │ │
│ │ │ Você não precisa fazer nada  │ │ │
│ │ │ agora. Resposta típica: até  │ │ │
│ │ │ 5 dias úteis.                │ │ │
│ │ ╰──────────────────────────────╯ │ │
│ │  Ver vaga →                      │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │ Recepcionista       [Encerrado]  │ │
│ │ Agradecemos seu interesse.       │ │
│ │ ⚖ Entenda a decisão (LGPD) →     │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│  [ Ver vagas abertas → ]             │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Deletar os 6 tiles e os 6 filtros de status** (para ≤3 candidaturas, lista direta; filtros só reaparecem se `total > 5`). Elimina de graça o contador vermelho "Rejeitadas".
- **Stepper de 5 etapas por card** (Inscrição → Triagem → Avaliação → Entrevista → Decisão), derivado do `funilNavMap` — etapa atual destacada, `aria-current="step"`.
- Quando `destino === null`: **estado informativo, não botão** — "Em análise pela nossa equipe. Você não precisa fazer nada agora" + prazo típico configurável por vaga. Quando `destino` existe, mantém o CTA turquesa dominante ("Continuar para Avaliação →").
- Rejeição: badge neutro cinza **"Processo encerrado"** (sem `AlertCircle` vermelho), feedback digno persistido + card LGPD como elemento dominante (o detalhamento do fluxo de rejeição está em 3.4).
- Título "Minhas candidaturas"; `CandidatoNavbar` compartilhado.

### 1.7 — Instruções do formulário (`/candidato/candidatura/instrucoes`)

**Rota + arquivo:** `/candidato/candidatura/instrucoes` → `src/components/pages/InstrucoesFormularioPage.tsx`.

**O que o candidato vê hoje (se chegar — a página é órfã):** vídeo do YouTube embedado, "Antes de Começar", seções "Por que este formulário existe?" (copy genuinamente boa: "Este não é um filtro burocrático. É uma conversa estruturada…"), "O que você ganha investindo 15-20 minutos", "Como preencher" com a **promessa falsa** "Você pode salvar e continuar mais tarde" (`:160` — o formulário real é D-06, sem rascunho), e botão "Iniciar Formulário" que navega com `vagaId`/localStorage para uma rota que espera **slug** — com fallback hardcoded `'1'` (`:24-30`) → "Vaga não encontrada".

**Momento emocional:** (hipotético, dado o orfanato) — seria o momento de **preparação e enquadramento**: baixar a ansiedade, explicar o "porquê", alinhar expectativa de esforço. O conteúdo emocional está certo; a engenharia em volta está quebrada.

**Fricções e furos:** todos já mapeados pela avaliação (órfã, slug/vagaId, fallback '1', promessa falsa). A extensão aqui é **decidir pelo caminho (b)** da avaliação e especificar o encaixe: o interstitial resolve *também* o furo da tela 1.3 (expectativa de custo) e o "beco do cadastro" (1.5) — é a cola natural entre "conta criada" e "formulário".

**Redesenho proposto** (reabilitada como interstitial `/vagas/:slug/antes-de-comecar`):

```
┌──────────────────────────────────────┐
│ ← Vaga: ASB — Curitiba               │
│                                      │
│  Antes de começar                    │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │  ▶ vídeo (1 min) — opcional      │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│  O que você vai fazer agora:         │
│  ▸ Anexar seu currículo (PDF)        │
│  ▸ Responder 8 perguntas sobre       │
│    sua experiência                   │
│  ▸ Tempo estimado: ~15 min           │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │ Recomendamos completar em uma    │ │
│ │ única sessão. Não é prova: não   │ │
│ │ há resposta certa — seja você.   │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │      Começar  →                  │ │
│ └──────────────────────────────────┘ │
│   Deixar para depois (fica no seu    │
│   painel como pendente)              │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- Rota recebe **slug** (`/vagas/:slug/antes-de-comecar`); VagaDetalhe → (auth) → interstitial → formulário. "Iniciar" navega `formulario/${slug}`. Apagar fallback `'1'` e leitura de localStorage.
- **Checklist do custo real** derivado dos dados da vaga: nº de perguntas (`useVagaPerguntas` já retorna a lista) + "currículo PDF" — expectativa exata, não genérica.
- Corrigir a copy do rascunho: "recomendamos completar em uma única sessão" **sem** prometer salvar (até o formulário ganhar rascunho — ver 1.8).
- "Deixar para depois" honesto: volta ao dashboard com a candidatura pendente visível (exige apenas o CTA de retomada que o `funilNavMap` já daria).

### 1.8 — Formulário de candidatura + knockout (`/candidato/candidatura/formulario/:vagaSlug`)

**Rota + arquivo:** → `src/components/pages/FormularioCandidaturaPage.tsx` (834 linhas).

**O que o candidato vê hoje:** página única `max-w-3xl` com 4 seções em cards glass **brancos** (única tela do fluxo com cards claros sobre o gradiente): resumo da vaga; upload de currículo (PDF ≤5 MB, click-only, com remover); perguntas de triagem agrupadas por bloco (texto curto/longo, numérico, single/multiple choice com "Outro"); botão "Enviar candidatura" desabilitado sem CV (`:656`). O submit é atômico via EF com knockout server-side; sobrevivente → toast de sucesso + dashboard; knockout → **resultado inline digno** "Inscrição recebida / Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento" sem critério, sem alarme, sem toast falso (`:503-538`). Tratamento de erros exemplar: cleanup de CV órfão, retry executável, sessão expirada preserva redirect.

**Momento emocional:** é a **entrega** — a pessoa está finalmente fazendo a coisa que veio fazer. Duas ansiedades dominam: *"vou conseguir anexar o currículo pelo celular?"* e *"se algo der errado, perco tudo?"*. E no knockout, o momento mais delicado de todo o segmento: ouvir "não" segundos depois de investir 20+ minutos.

**Fricções e furos:**
- **D-06 sem rascunho E sem leave-guard:** diferente do cadastro (que tem os dois), aqui um back-gesture acidental, um refresh ou o Android matando a aba descartam todas as respostas digitadas — silenciosamente. Não há `beforeunload` nem persistência em nenhuma linha do arquivo. Para um form de texto longo no mobile, este é **o maior risco de perda do segmento** (espelho exato do achado de autosave das avaliações assíncronas, uma etapa antes).
- **CV como gate absoluto e hostil ao mobile:** botão de envio desabilitado sem PDF (`:656`) sem explicação visível do porquê; muitos ASB/recepção não têm currículo em PDF no celular. Não há aceitação de imagem/foto, não há caminho "estou sem o arquivo agora", e o disabled mudo viola o mesmo princípio do login (1.4).
- **Sem indicador de progresso/custo:** a página única não diz quantas perguntas existem nem quanto falta — em blocos longos, a barra de rolagem é o único feedback.
- **Inputs nativos minúsculos nas perguntas:** radios/checkboxes default do browser com `text-sm` (`:770-776`, `:806-812`) — abaixo do alvo de toque de 44px que o resto do sistema respeita; textarea de 4 rows para texto longo.
- **Knockout: beco digno, mas beco** (`:503-538`): a única ação é "Voltar". Não oferece "Ver outras vagas" (a pessoa está autenticada e o inventário existe!) nem menciona o direito de revisão/explicação — o card LGPD só aparecerá se ela descobrir o dashboard sozinha.
- **Sobrevivente cai no dashboard sem cerimônia:** toast de 4s + redirect (`:357-360`). O momento de maior boa-vontade do candidato (acabou de investir 20 min) não recebe um "o que acontece agora" — vai direto para a tela de espera.

**Redesenho proposto** (formulário + os dois desfechos):

```
┌──────────────────────────────────────┐
│ ← Vaga        Respondidas: 3 de 8    │
│  ▓▓▓▓▓▓░░░░░░░░  Rascunho salvo ✓    │
│                                      │
│ ╭─ Currículo ──────────────────────╮ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │  ⬆ Anexar PDF (máx. 5 MB)    │ │ │
│ │ └──────────────────────────────┘ │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│ ╭─ Sobre sua experiência ──────────╮ │
│ │ Você tem curso de ASB            │ │
│ │ concluído? *                     │ │
│ │  ┌──────────────────────────┐    │ │
│ │  │  ○  Sim                  │    │ │
│ │  ├──────────────────────────┤    │ │
│ │  │  ●  Não                  │    │ │
│ │  └──────────────────────────┘    │ │
│ │  (opções = linhas de 48px)       │ │
│ ╰──────────────────────────────────╯ │
│ ┌──────────────────────────────────┐ │
│ │     Enviar candidatura  →        │ │
│ └──────────────────────────────────┘ │
│  Falta: anexar currículo (1 item)    │
└──────────────────────────────────────┘

Knockout (inline, tom mantido):
┌──────────────────────────────────────┐
│  Inscrição recebida                  │
│                                      │
│  Após análise dos requisitos da      │
│  vaga, não seguiremos com sua        │
│  candidatura neste momento.          │
│  Agradecemos seu interesse na        │
│  Beauty Smile.                       │
│                                      │
│  Esta triagem considera apenas       │
│  requisitos objetivos da vaga.       │
│  Você pode ver os detalhes no        │
│  seu painel.                         │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │   Ver outras vagas abertas  →    │ │
│ └──────────────────────────────────┘ │
│    Ir para o meu painel              │
└──────────────────────────────────────┘

Sobrevivente (nova tela, antes do
dashboard):
┌──────────────────────────────────────┐
│  ✓ Candidatura enviada!              │
│  ASB — Curitiba                      │
│                                      │
│  O que acontece agora:               │
│  ● Inscrição ─ concluída             │
│  ○ Triagem ─ nossa equipe analisa    │
│    (normalmente até 5 dias úteis)    │
│  ○ Avaliação · ○ Entrevista          │
│                                      │
│  Acompanhe tudo pelo seu painel —    │
│  qualquer novidade aparece lá.       │
│ ┌──────────────────────────────────┐ │
│ │    Ir para o meu painel  →       │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Rascunho + leave-guard:** reaproveitar o padrão pronto do cadastro (`useCadastroDraft` + debounce 500ms + toast de restauração "Retomamos de onde você parou") num `useCandidaturaDraft` chaveado por `vagaSlug`; `beforeunload` enquanto houver campo sujo. Revoga o D-06 — a justificativa dele ("sessão única") morre no primeiro telefonema recebido.
- **Progresso no topo:** "Respondidas: N de M" derivado de `perguntas.length` vs campos preenchidos (`form.watch`) + selo de rascunho.
- **Opções como cartões de 48px** (label full-width com borda, radio/checkbox estilizado) em vez de inputs nativos `text-sm`.
- **Submit sempre habilitado** + resumo de pendências abaixo do botão ("Falta: anexar currículo"); ao tocar, rolar até o primeiro item pendente. CV continua obrigatório — mas o *porquê* do bloqueio fica visível.
- **Knockout:** manter a copy D-15 travada, acrescentar (a) uma frase de transparência não-clínica ("esta triagem considera apenas requisitos objetivos da vaga" — coerente com LGPD Art. 20 sem expor o critério) e (b) **"Ver outras vagas" como CTA primário** — transforma o "não" em recirculação em vez de saída.
- **Tela de confirmação do sobrevivente** com o stepper e a promessa correta ("acompanhe pelo painel" — nunca "avisaremos por e-mail" enquanto o e-mail não existir), substituindo o toast+redirect seco.

**Invariantes preservados em todo o segmento:** nenhum score/banda jamais aparece ao candidato (RNF-07a); o único auto-reject continua sendo o knockout determinístico da etapa 1, com a copy D-15 intocada; toda linguagem usa "avaliação comportamental/situacional"; a explicação LGPD Art. 20 ganha *mais* pontos de acesso (knockout e dashboard), nunca menos.

---

## Segmento 2 — Avaliações (Etapa 3): walkthrough tela-a-tela

> **Relação com a M4-PRODUCT-EVALUATION:** os 4 furos macro já registrados lá (autosave que nunca restaura, cards eternamente "Pendente", prova cognitiva inalcançável, devolutiva sem polling + e-mail fantasma) são **assumidos como conhecidos**. Abaixo cada tela é destrinchada com fricções *novas* de nível de tela, o momento emocional e um redesenho concreto. Todos os mockups assumem glass UI Beauty Smile (gradiente + painéis translúcidos), mobile ~375px. Os pontos de desistência do segmento estão marcados no mapa unificado do topo do documento.

### 2.1 — Hub de avaliações

**Rota + arquivo:** `/candidato/avaliacao/:candidaturaId` → `src/features/avaliacao/components/AvaliacaoContainer.tsx`

**O que existe hoje:** shell glass com navbar sticky (avatar + nome + "Sair"), logo, título "Avaliação", subtítulo "Conclua as avaliações abaixo no seu ritmo. Você pode fazê-las em qualquer ordem." e um card por entry de `vaga.testes_aplicaveis`, cada um com label pt-BR, "Tempo estimado: ~N min", pill de status e CTA "Começar avaliação". Estados: skeleton, erro com retry, gate neutro de etapa errada ("Esta avaliação não está disponível"), vazio, e "Tudo concluído!".

**Momento emocional:** é o portão da etapa mais cara da jornada. O candidato acabou de ser avançado da triagem — está animado ("passei!") mas apreensivo ("quanto isso vai tomar de mim? vão me julgar?"). Ele precisa de **dimensionamento** (quantas, quanto tempo total, o que é cada uma) e de **prova de progresso** ao voltar.

**Fricções e furos (além do M7/H15 já registrado):**
1. **Zero orientação de esforço total.** Não há "3 avaliações · ~50 min no total" nem ordem recomendada — "em qualquer ordem" é liberdade sem mapa. Para 120 itens + caso de 200-500 palavras, o candidato não consegue planejar a sessão (o maior preditor de abandono mobile).
2. **Fallback de tempo mentiroso:** `tempo == null → '~10 min'` (`AvaliacaoContainer.tsx:179`) — o Big Five vira "~10 min" quando são ~15-20. Promessa quebrada logo no portão.
3. **Card sem descrição.** "Avaliação de situações" / "Caso prático" não dizem *o que* o candidato vai fazer ("escolher como agiria em cenários da clínica"). Ansiedade evitável.
4. **Ramo "Continuar avaliação" é código morto** (`:208-210` — depende de `status 'em_andamento'/'parcial'` que nada escreve). A affordance de retomada existe no JSX e nunca renderiza.
5. **"Tudo concluído!" é beco sem saída:** sem CTA "Voltar ao painel" (`:163-170`) — só o "Sair" da navbar. E sem link para a devolutiva Big Five, que é o único conteúdo que o candidato ganha.
6. **O gate de etapa é retroativo demais:** `etapa_atual !== 'avaliacao_assincrona'` (`:373`) tranca o hub inteiro assim que o RH avança o candidato — inclusive o caminho para rever a devolutiva. Avançar (boa notícia!) é apresentado como porta trancada.
7. **Label default title-case cru** (`:67-71`): teste desconhecido (ex.: `cognitivo`) vira card "Cognitivo" sem label pt-BR "Prova de raciocínio lógico" — e clica para a rota errada (H7/H10, já no audit).

**Redesenho proposto:**

```
┌──────────────────────────────────────┐
│ ◄ Painel        Maria S.        Sair │  ← navbar: volta p/ dashboard
├──────────────────────────────────────┤
│      Sua etapa de avaliações         │
│  1 de 3 concluídas · faltam ~35 min  │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░░░  33%          │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ✓ Avaliação de situações         │ │
│ │   Concluída · enviada 12:40      │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ● Caso prático            ~20min │ │
│ │   Como você resolveria uma       │ │
│ │   situação real da clínica.      │ │
│ │   Rascunho salvo · 134 palavras  │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │     Continuar de onde parei  │ │ │
│ │ └──────────────────────────────┘ │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ○ Avaliação comportamental ~15min│ │
│ │   120 afirmações sobre seu       │ │
│ │   estilo. Pode pausar e voltar.  │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │        Começar               │ │ │
│ │ └──────────────────────────────┘ │ │
│ └──────────────────────────────────┘ │
│                                      │
│  Sem prazo rígido. Seu progresso     │
│  fica salvo neste painel.            │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Status real por candidatura** (cruzar `respostas_avaliacao`/`scores_candidato`/`redacoes_candidato` — a proposta do eval) **+ o estado intermediário "Rascunho salvo · N palavras / N de 120"**, derivado das mesmas rows de draft do servidor. Isso ativa o ramo "Continuar" que hoje é morto e transforma o hub no ponto de retomada.
- Header de dimensionamento: "X de Y concluídas · faltam ~N min" (soma dos `tempo_est_min` reais dos pendentes; nunca o fallback `~10`).
- 1 linha de descrição por card + ordem sugerida (mais curta primeiro — vitória rápida reduz abandono).
- "Tudo concluído!" ganha: CTA "Voltar ao painel", link "Ver meu perfil comportamental" (quando a devolutiva existir) e copy honesta "Acompanhe os próximos passos aqui no painel" (nada de e-mail).
- Etapa avançada ≠ porta trancada: se `etapa_atual` já passou de `avaliacao_assincrona`, renderizar o hub em modo leitura ("Etapa concluída — você avançou para Entrevista") com os cards concluídos e o link da devolutiva, em vez do `WrongEtapaState` genérico.

### 2.2 — SJT múltipla escolha

**Rota + arquivo:** `/candidato/avaliacao/:candidaturaId/mc` → `src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx`

**O que existe hoje:** uma situação por vez ("Situação 1 de N"), corpo do cenário, radio-group de opções (via RPC `get_opcoes_sjt`, sem gabarito), timer soft contando para cima "(sem limite rígido)", Voltar/Avançar gated por resposta, e no último item o AlertDialog irreversível → `pontuar_sjt` → toast → volta ao hub.

**Momento emocional:** é provavelmente o *primeiro* teste que ele faz. Modo prova ativado: "existe resposta certa?" (existe — mas ele não deve sentir isso). O timer "sem limite rígido" acalma bem. O medo dominante é dar a resposta "errada para a empresa".

**Fricções e furos:**
1. **Única tela da etapa sem NENHUMA persistência** — `respostas`/`index` só em `useState` (`:129-130`), sem `useAutosaveAvaliacao` nem sessionStorage. Uma ligação no meio do teste = zero de novo. (Raiz no eval; o detalhe novo é que é a *exceção* da etapa — o hook existe e é usado nas 3 telas vizinhas.)
2. **Re-shuffle a cada remontagem:** o `shuffle` é `useMemo` sobre o fetch (`:83-86`) com `staleTime: Infinity` — estável *na sessão*, mas ao voltar depois de um reload as opções aparecem em **outra ordem**. Combinado com a fricção 1, o candidato que perdeu progresso ainda reencontra o teste "embaralhado" — sensação de sistema instável.
3. **Sem barra de progresso** — só o texto "Situação 2 de 6"; as telas irmãs (Big Five) têm `Progress`. Inconsistência barata de resolver.
4. **Sem saída declarada:** não há botão "Voltar ao painel" durante o teste; a única rota de fuga é o back do browser. Para "vou terminar depois" (que hoje nem funciona), o candidato não tem gesto.
5. **Sem revisão pré-envio:** o dialog diz "você não poderá editar", mas não mostra um resumo ("6 de 6 respondidas") — o candidato confirma às cegas.
6. **Pós-envio, o loop da dúvida:** toast "Avaliação enviada" → hub → card ainda "Pendente" (`AvaliacaoContainer.tsx:261`). A tela faz tudo certo e a jornada desfaz.

**Redesenho proposto:**

```
┌──────────────────────────────────────┐
│ ◄ Salvar e sair       ⏱ 03:12 soft  │
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░  Situação 2 de 6 │
├──────────────────────────────────────┤
│ CENÁRIO                              │
│ Uma paciente chega 20 min atrasada   │
│ e a agenda está cheia. Ela está      │
│ visivelmente ansiosa…                │
│                                      │
│ Como você agiria?                    │
│ Não há resposta certa ou errada —    │
│ queremos conhecer seu jeito.         │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ○ Encaixo entre dois horários…   │ │
│ ├──────────────────────────────────┤ │
│ │ ● Explico a situação e ofereço   │ │
│ │   reagendar com prioridade…      │ │
│ ├──────────────────────────────────┤ │
│ │ ○ Peço orientação à dentista…    │ │
│ └──────────────────────────────────┘ │
│         ✓ Salvo automaticamente      │
│                                      │
│ ┌────────────┐        ┌────────────┐ │
│ │   Voltar   │        │  Avançar   │ │
│ └────────────┘        └────────────┘ │
└──────────────────────────────────────┘

── Dialog de envio (último item) ──────
│ Enviar avaliação?                    │
│ 6 de 6 situações respondidas.        │
│ Após enviar, não será possível       │
│ alterar.                             │
│ [ Revisar respostas ]  [ Enviar ]    │
```

**Mudanças de fluxo/copy/estado:**
- Adotar `useAutosaveAvaliacao` (buffer `{pergunta_id → opcao_id, _index}`) + **hidratar no mount** (sessionStorage → fallback `respostas_avaliacao` do servidor) — restaura respostas *e* posição. Persistir também a ordem embaralhada (array de `opcao_id`) no draft para a fricção 2 sumir.
- Barra `Progress` + "Salvar e sair" no topo (leva ao hub, que passa a mostrar "Rascunho · 2 de 6").
- Copy anti-prova junto da pergunta: "Não há resposta certa ou errada — queremos conhecer seu jeito" (espelha o Big Five; hoje o texto é só instrucional).
- Dialog com contagem ("6 de 6 respondidas") e "Revisar respostas" voltando para a situação 1.
- Após envio bem-sucedido, invalidar a query do contexto do hub para o card virar "Concluída" na hora (depende do fix de status do hub).

### 2.3 — Caso prático (SJT aberto)

**Rota + arquivo:** `/candidato/avaliacao/:candidaturaId/caso` → `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx`

**O que existe hoje:** "Caso prático" + indicador de autosave no topo, cenário, textarea de 12 linhas com autosave 30s + flush no blur, contador de palavras 3 estados (mín 200 / máx 500 / ok em âmbar/branco), envio gated + AlertDialog → EF `avaliar-redacao` **síncrona com IA**. Back-lock 42501 vira "Sua etapa avançou." neutro.

**Momento emocional:** o de maior investimento por caractere. Digitar 200-500 palavras num teclado de celular leva 20-40 min reais. O candidato *confia* no "Salvo automaticamente" que pisca no canto — essa confiança é o contrato da tela. E no envio ele está exausto e quer só o "ok, recebi".

**Fricções e furos:**
1. **O contrato de confiança é quebrado nos dois extremos:** o texto nunca é restaurado (`useState('')` em `:111`, `draft.load()` jamais chamado) — já no eval — **e** o indicador "Salvo automaticamente" continua verde enquanto isso. A tela *exibe* a promessa que não cumpre. Pior combinação possível.
2. **Envio bloqueante de 38-102s** (`avaliacaoService.ts:313` → `await callAi` na EF): "Enviando…" num spinner por até 2 min de 4G. Se a IA falha, o toast manda "Tente novamente" (`:152`) — cobrando retry de algo cujo **texto já está salvo no servidor** (o `flushNow()` de `:138` rodou antes). Retry = segunda chamada de IA paga + mais espera.
3. **Sem preview de estrutura:** a instrução "Descreva como você lidaria…" não dá esqueleto (situação → ação → resultado). Para ASB/recepção — perfis não habituados a redação — a página em branco é paralisante.
4. **Contador só-texto:** "134 palavras — mínimo 200" em âmbar; sem barra visual de faixa. No meio da digitação mobile, glance-ability importa.
5. **Sem "Salvar e sair"** — mesma ausência do MC; a única saída visível é o back do browser, e o candidato não sabe que (em tese) poderia voltar.

**Redesenho proposto:**

```
┌──────────────────────────────────────┐
│ ◄ Salvar e sair   ✓ Salvo há 20s    │
├──────────────────────────────────────┤
│ Caso prático                         │
│ CENÁRIO                              │
│ Um paciente reclama publicamente     │
│ na recepção sobre um atraso…         │
│                                      │
│ Dica de estrutura:                   │
│  1. O que você faria primeiro        │
│  2. Como falaria com o paciente      │
│  3. O que faria depois, com a equipe │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Eu começaria levando o paciente  │ │
│ │ para um espaço reservado…▌       │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│ 134 ─────────●───────── 200     500  │
│ ▓▓▓▓▓▓▓▓░░░░░░  faltam 66 palavras   │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │          Enviar resposta         │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘

── Pós-confirmação (ack imediato) ─────
│ ✓ Resposta registrada!               │
│ Seu caso prático foi salvo com       │
│ segurança. Não precisa esperar       │
│ nada aqui.                           │
│ [ Voltar às avaliações ]             │
```

**Mudanças de fluxo/copy/estado:**
- **Hidratar no mount** (draft → servidor). Se restaurou: banner discreto "Retomamos sua resposta de onde você parou" (mesmo padrão do cadastro, que já faz isso certo).
- **Desacoplar a IA do envio** (a proposta estrutural do eval): a EF grava e devolve ack neutro; avaliação roda em background. A tela pós-envio acima passa a ser instantânea. Enquanto o desacoplamento não sai: estados de espera em fases ("Registrando sua resposta…" → 10s → "Quase lá — pode levar até 2 min, não feche a tela") e, em falha de IA **após** persistência, ack de sucesso mesmo assim ("Resposta registrada") — nunca pedir retry do que já está salvo.
- Dica de estrutura em 3 passos acima do textarea (copy por cargo via seed da pergunta).
- Barra de faixa 200-500 sob o contador (progress até o mínimo; âmbar só acima do máximo).
- Timestamp real no indicador: "Salvo há 20s" comunica mais que o binário "Salvo automaticamente".

### 2.4 — Big Five (120 itens)

**Rota + arquivo:** `/candidato/avaliacao/:candidaturaId/bigfive` → `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx`

**O que existe hoje:** intro exemplar (página 0: disclaimer emocional visível, legenda da escala, "120 afirmações · ~15 min · sem resposta certa ou errada"), depois 12 páginas × 10 itens em glass escuro `bg-black/45`, item com "{n} / 120" + escala 1-5 de extremos rotulados, `Progress` + contagem neutra, autosave 30s, avanço gated por página completa, submit → devolutiva.

**Momento emocional:** maratona. Páginas 1-3 fluem; a partir do item ~60 entra a fadiga ("quanto falta?", tentação de responder no automático); qualquer interrupção externa (a norma no celular) é o momento decisivo — e hoje é fatal (`useState({})` em `:321` vs a promessa da intro em `:280`, já no eval).

**Fricções e furos (novos):**
1. **A intro não pede ambiente:** "~15 min" está lá, mas não "reserve um momento tranquilo — é melhor de uma vez só". Como a retomada está quebrada, a tela nem tenta prevenir a interrupção que não sabe curar.
2. **Fadiga sem alívio:** nenhum micro-feedback de marco (metade!, última página!) nas 12 páginas — só o `answeredCount` seco. Em instrumentos de 120 itens, marcos reduzem straight-lining (respostas em linha reta), que aqui contamina o dado que o RH vai usar.
3. **Estimativa não decresce:** o candidato na página 8 não vê "faltam ~5 min" — só "78/120". O custo restante percebido é o que decide se ele para "só um minutinho" (e não volta).
4. **`pageAnswered` obrigatório para avançar** (`:438` + `:486`): com 10 itens/página e restore quebrado, um item esquecido = página inteira bloqueada sem indicação de *qual* item falta (não há scroll-to-missing).
5. **Submit navega para uma devolutiva que ainda não existe** (`:359` → 2.5). O clímax de 120 respostas aterrissa num "ainda está sendo preparada".

**Redesenho proposto (página de questionário + banner de retomada):**

```
┌──────────────────────────────────────┐
│ Página 6 de 12      ✓ Salvo há 8s   │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░  58/120 · ~7 min  │
│                                      │
│ ☺ Mais da metade! Continue no seu    │
│   ritmo — tudo está salvo.           │
│                                      │
│ ① Discordo tot. … ⑤ Concordo tot.   │
├──────────────────────────────────────┤
│ 58 / 120                             │
│ Gosto de manter tudo em ordem.       │
│ ┌────┬────┬────┬────┬────┐           │
│ │ 1  │ 2  │ 3  │ 4▓ │ 5  │           │
│ └────┴────┴────┴────┴────┘           │
│ Discordo tot.      Concordo tot.     │
├──────────────────────────────────────┤
│ 59 / 120                             │
│ Fico à vontade com pessoas novas.    │
│ ┌────┬────┬────┬────┬────┐           │
│ │ 1  │ 2  │ 3  │ 4  │ 5  │           │
│ └────┴────┴────┴────┴────┘           │
│          ⋮ (10 itens)                │
│ ┌────────────┐        ┌────────────┐ │
│ │   Voltar   │        │  Avançar   │ │
│ └────────────┘        └────────────┘ │
└──────────────────────────────────────┘

── Ao reabrir com rascunho ────────────
│ ┌──────────────────────────────────┐ │
│ │ Bem-vinda de volta!              │ │
│ │ Você respondeu 58 de 120.        │ │
│ │ [ Continuar do item 59 ]         │ │
│ │ [ Recomeçar do zero ]            │ │
│ └──────────────────────────────────┘ │
```

**Mudanças de fluxo/copy/estado:**
- **Hidratar `respostas` + página no mount** (draft/servidor) e pular a intro quando há rascunho, indo direto ao banner "Bem-vinda de volta" (padrão já provado no `useCadastroDraft`).
- Progress com **tempo restante decrescente** ("58/120 · ~7 min") — 120 itens × ~7s/item é estimável com segurança.
- Micro-marcos nas páginas 4/6/9/12 ("Um terço!", "Metade!", "Última página!") — 1 linha, tom leve, sem gamificação pesada.
- Avançar bloqueado → scroll suave até o primeiro item sem resposta + realce do card (hoje o botão só fica cinza).
- Intro: acrescentar "Melhor de uma vez só? Reserve ~15 min. Precisou parar? Sem problema — voltamos exatamente de onde você parou" (verdadeiro só depois do fix).
- Pós-submit: em vez de navegar direto, tela intermediária de celebração ("Pronto! Suas 120 respostas foram enviadas") com o CTA "Ver meu perfil comportamental" → devolutiva (que então já pode estar em preparo — ver 2.5).

### 2.5 — Devolutiva Big Five

**Rota + arquivo:** `/candidato/avaliacao/:candidaturaId/bigfive/devolutiva` → `src/features/avaliacao/components/DevolutivaBigFiveView.tsx`

**O que existe hoje:** quando há dados, é a melhor tela candidato-facing do sistema — dashboard das 5 dimensões (percentil + banda + barra), analogia "em um grupo de 100 pessoas", tabs por dimensão com texto interpretativo, rodapé LGPD/CRP fixo. Quando **não** há (o caso real, dada a EF de 5 chamadas de IA que estoura timeout): spinner → "Sua devolutiva ainda está sendo preparada… avisaremos por e-mail" sem polling (`:97-101`) e sem nenhum link de volta em outra tela.

**Momento emocional:** é a **recompensa**. O candidato deu 120 respostas íntimas e este é o único momento em que o sistema devolve algo sobre *ele*. Chegar aqui e ver "volte depois" — sem saber quando, sem aviso que chega, sem caminho de volta — converte reciprocidade em frustração. E é também a tela mais sensível: ele está lendo uma descrição da própria personalidade.

**Fricções e furos (novos):**
1. **Erro e "ainda não pronto" são o mesmo estado:** `isError || !data` (`:114`) — uma falha de rede rende a mesma mensagem "sendo preparada". O candidato com internet ruim nunca descobre que era só recarregar.
2. **Estado de espera sem expectativa de tempo nem progresso** — nem "isso leva ~2 minutos", nem spinner de estágio, nem auto-refresh.
3. **Tabs com nomes longos em mobile:** 5 triggers tipo "Abertura à Experiência" em `flex-wrap text-xs` (`:182-186`) viram um bloco de chips de 2-3 linhas — funcional, mas a hierarquia se perde; scroll horizontal com indicador seria mais limpo.
4. **Sem persistência do acesso:** nada de "salvar/baixar/receber por e-mail" e nenhuma entrada no dashboard — a devolutiva é efêmera por acidente. (O link permanente já foi proposto no eval; o detalhe novo é que ela **também some quando a etapa avança**, via gate do hub — 2.1, fricção 6.)

**Redesenho proposto (estado de espera + header):**

```
── Estado "em preparo" (com polling) ──
┌──────────────────────────────────────┐
│        Preparando seu perfil…        │
│                                      │
│   ✓ Respostas recebidas              │
│   ✓ Percentis calculados             │
│   ◌ Escrevendo sua devolutiva        │
│                                      │
│  Isso leva ~2 minutos. Esta página   │
│  atualiza sozinha — e o link "Meu    │
│  perfil comportamental" ficará       │
│  sempre disponível no seu painel.    │
│                                      │
│ [ Voltar ao painel enquanto isso ]   │
└──────────────────────────────────────┘

── Devolutiva pronta (header) ─────────
┌──────────────────────────────────────┐
│ Maria — Seu perfil comportamental    │
│ Um retrato de como você se           │
│ descreveu. Não é nota nem            │
│ resultado do processo.               │
│                                      │
│ Abertura à Experiência               │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░  P72 · Mod. alto  │
│ Conscienciosidade                    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░  P85 · Muito alto  │
│  … (5 dimensões)                     │
│                                      │
│ ◄ [Abertura] [Consc.] [Extrov.] ►    │  ← chips com scroll horizontal
│ ┌──────────────────────────────────┐ │
│ │ Abertura: Moderadamente alto     │ │
│ │ Em um grupo de 100 pessoas…      │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Separar os 3 estados:** carregando / **em preparo** (row ausente → `refetchInterval: 10_000` por até 5 min, com os estágios acima) / erro real (retry). Hoje 2 e 3 são indistinguíveis.
- Copy do preparo sem e-mail: "esta página atualiza sozinha" + garantia de permanência ("ficará no seu painel") — mata a ansiedade de perder o link.
- Uma linha de enquadramento no header ("Não é nota nem resultado do processo") — o percentil é o único número que o candidato vê no sistema inteiro; sem enquadramento, ele o lerá como nota de aprovação (risco direto de má-leitura do RNF-07a).
- Chips de dimensão com scroll horizontal + setas em vez de wrap.
- Raiz: gerar a devolutiva **no submit** (background) em vez de on-demand — quando o candidato chegar, já existe (alinha com o achado devolutiva-timeout do M3/P21).

### 2.6 — Redação cultural

**Rota + arquivo:** `/candidato/redacao/:candidaturaId` → `src/features/avaliacao/components/RedacaoEditorScreen.tsx`

**O que existe hoje:** "Pergunta {n} de {total}", prompt verbatim, "Tempo estimado: 15-25 min", cronômetro informativo, textarea 14 linhas com autosave, `RedacaoCounter` 3 bandas, envio via AlertDialog → EF `avaliar-redacao-cultural` (IA síncrona, `redacaoService.ts:264`), "Próxima pergunta" após enviar, all-done "Redações concluídas. Avisaremos… por e-mail."

**Momento emocional:** idêntico ao caso prático, mas multiplicado por N perguntas — e com um agravante de expectativa: o dialog e o toast **prometem revisão** ("Você ainda pode revisá-la até concluir esta etapa", `:369`; "Você pode revisar até concluir a etapa", `:188`).

**Fricções e furos (novos):**
1. **A promessa de revisão é falsa na UI:** depois de enviar, `goNext()` limpa o texto (`:168-173`) e não existe navegação de volta para uma pergunta enviada (`idx` só avança; a pergunta some da tela). O backend até aceitaria re-envio antes do avanço de etapa — mas não há botão. Duas superfícies de copy prometem algo que nenhum caminho de UI oferece. Ou se constrói "Ver/editar resposta enviada", ou se alinha a copy com o MC ("não poderá editar").
2. **Falso-positivo de anti-cheat em interrupção:** `tempo_gasto_segundos` vem do cronômetro da sessão (`elapsedSecondsRef`, `:140-143`), que zera em reload/remontagem. Candidato que escreveu 25 min, caiu a conexão, voltou (quando o restore existir) e enviou em 60s → flag `tempo_anormalmente_curto` (<90s) injusta no lado do RH. O tempo deve acumular no draft (`_elapsed` persistido), não na memória.
3. **Mesmo envio bloqueante de IA** do caso prático (fricção 2 da 2.3, mesma solução).
4. **All-done sem inventário:** "Redações concluídas" não lista o que foi enviado ("Pergunta 1 ✓ 312 palavras · Pergunta 2 ✓ 268 palavras") — o candidato ansioso não tem recibo do que entregou.
5. **Restore ausente** idem telas anteriores — com detalhe: o autosave já namespace-ia por `pergunta_id` (`:150` comment), então a base para restaurar por pergunta está pronta.

**Redesenho proposto (estado all-done como recibo):**

```
┌──────────────────────────────────────┐
│ ✓ Redações concluídas!               │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Pergunta 1 · enviada 14:32       │ │
│ │ 312 palavras          [ Ver ]    │ │
│ ├──────────────────────────────────┤ │
│ │ Pergunta 2 · enviada 14:58       │ │
│ │ 268 palavras          [ Ver ]    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Você pode revisar e reenviar até     │
│ esta etapa ser concluída.            │
│                                      │
│ Acompanhe os próximos passos no      │
│ seu painel — sem prazo de resposta   │
│ perdido: avisamos por aqui.          │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │      Voltar às avaliações        │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Decidir a revisão:** caminho A (recomendado, honra a copy): "Ver" abre a resposta enviada em modo leitura com "Editar e reenviar" habilitado enquanto `etapa_atual === 'avaliacao_assincrona'` (o back-lock 42501 já protege o depois). Caminho B (barato): trocar as duas copies para "Após enviar, você não poderá editar" — consistente com o MC.
- Acumular `tempo_gasto_segundos` no draft persistido; ao restaurar, retomar o cronômetro do valor salvo (conserta o falso-positivo do anti-cheat).
- Envio assíncrono/ack imediato (compartilhado com a 2.3).
- Recibo no all-done (lista `getMinhasRedacoes`, que já retorna as rows) + copy sem e-mail.
- Restore por pergunta no mount (o namespace por `pergunta_id` do buffer já existe).

### 2.7 — Prova de raciocínio lógico

**Rota + arquivo:** `/candidato/prova-cognitiva/:candidaturaId` → `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx`

**O que existe hoje:** gate de opt-in (`vaga.aplica_cognitivo`), intro honesta ("Conclua a prova em uma única sessão; suas respostas são enviadas ao finalizar" — FX-13 amaciou a copy porque **não há autosave por design**), disclosure de proctoring transparente (blur de aba + paste-block, sem câmera), uma questão por vez, timer soft, dialog irreversível → `submitProva` com blur/eventos/tempo, ack neutro "Prova registrada."

**Momento emocional:** é a tela com maior *frame* de prova de toda a jornada ("raciocínio lógico" = "vão medir minha inteligência"). O disclosure de proctoring é ótimo para confiança — mas também eleva a tensão ("estou sendo vigiada"). E hoje ninguém sente nada disso, porque **nenhum clique leva até aqui** (H7/H10, já no eval).

**Fricções e furos (novos, assumindo o fix de alcançabilidade):**
1. **Proctoring de blur pune o contexto mobile:** trocar de app para responder uma notificação, ou o lock de tela, conta como blur (`useProctoring`) — no celular isso é a norma, não sinal de cola. O evento é registrado sem qualificação e o RH pode sobre-interpretar. Registrar `visibilitychange` com duração e etiquetar no payload ("blur curto <5s") reduziria falso-sinal; e a disclosure poderia tranquilizar: "notificações rápidas não são problema".
2. **Sem autosave numa tela irrecuperável:** aceito que é design (FX-13) — mas então a intro precisa ser um **gate explícito** ("Começar prova" numa página própria dizendo "reserve ~N min; se sair, recomeça"), não um parágrafo acima da primeira questão que o candidato lê depois de já ter começado (a tela renderiza direto a questão 1 com a intro espremida em `text-sm`).
3. **Sem contagem de questões no dimensionamento:** a intro não diz quantas questões nem tempo estimado — a única pista é "Questão 1 de N" já dentro da prova.
4. **Sem barra de progresso** (mesma lacuna do SJT MC).
5. **Saída pós-envio inconsistente:** `backToPanel` navega para `/candidato/dashboard` (`:107`), enquanto todas as telas irmãs voltam para o hub `/candidato/avaliacao/:id`. Se o cognitivo for exibido como card do hub (o fix proposto), o retorno deve ser o hub — senão o candidato "perde" o resto dos cards.
6. **Header desequilibrado no mobile:** `text-3xl md:text-4xl` (`:294`) para o título ao lado do timer num `flex justify-between` — em 375px o timer quebra apertado; as irmãs usam `text-xl`.

**Redesenho proposto (intro como gate + questão):**

```
── Intro/gate (nova página 0) ─────────
┌──────────────────────────────────────┐
│    Prova de raciocínio lógico        │
│    8 questões · ~12 min              │
│                                      │
│ ✓ Sem limite rígido de tempo         │
│ ✓ Uma questão por vez                │
│ ! Faça de uma vez só: se sair da     │
│   prova, será preciso recomeçar.     │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🛡 Transparência: registramos     │ │
│ │ quando a aba perde o foco (não   │ │
│ │ se preocupe com notificações     │ │
│ │ rápidas) e o campo não aceita    │ │
│ │ colar. Sem câmera, sem gravação, │ │
│ │ sem biometria.                   │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │       Estou pronta — começar     │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘

── Questão ────────────────────────────
┌──────────────────────────────────────┐
│ Prova de raciocínio    ⏱ 04:11 soft │
│ ▓▓▓▓▓░░░░░░░░░░░░  Questão 3 de 8   │
├──────────────────────────────────────┤
│ ENUNCIADO                            │
│ Se todas as ASBs da manhã também     │
│ atendem à tarde, e Clara atende      │
│ só de manhã, então…                  │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ○ Clara é ASB                    │ │
│ ├──────────────────────────────────┤ │
│ │ ● Clara não é ASB da manhã       │ │
│ ├──────────────────────────────────┤ │
│ │ ○ Nada pode ser concluído        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌────────────┐        ┌────────────┐ │
│ │   Voltar   │        │  Avançar   │ │
│ └────────────┘        └────────────┘ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Alcançabilidade primeiro** (fix do eval: `handleOpenTeste` mapear `cognitivo` → `/candidato/prova-cognitiva/:id` + label "Prova de raciocínio lógico" no hub).
- Página-gate de intro com contagem de questões, tempo estimado, o aviso de sessão única **antes** do início, e o disclosure com a linha tranquilizadora sobre notificações.
- Barra de progresso + título `text-xl` (consistência com as irmãs).
- Pós-envio: voltar ao **hub** (não ao dashboard) e marcar o card como concluído.
- No payload de proctoring: duração de cada blur, para o lado RH poder distinguir "notificação de 3s" de "sumiu 4 minutos" (contexto, nunca auto-rejeição — RNF-07a preservado).

---

## Segmento 3 — Espera, Decisão & Devolutiva

> **Tese do segmento:** em tempo de calendário, ~90% da jornada do candidato acontece *entre* ações — e é exatamente aí que o produto hoje não tem superfície. A avaliação de produto já registrou o e-mail fantasma, o botão no-op e a dupla taxonomia; este walkthrough estende com o que o código revela tela a tela: **o gate do card LGPD está invertido** (aparece quando a página não funciona, some quando funciona), **o candidato aprovado termina o funil em silêncio absoluto**, **a revisão Art. 20 é um loop sem volta** (não existe write-path para `revisao_resultado`), e **a matéria-prima da timeline já é legível pelo candidato via RLS** (`historico_candidatura`) — só não é renderizada.

### 3.1 — O Dashboard como sala de espera

> Complementa **1.6** (visão de chegada): aqui o foco é a mecânica da espera — de onde vem a informação e como o card comunica "com quem está a bola".

**Rota + arquivo:** `/candidato/dashboard` — `src/components/pages/DashboardCandidatoPage.tsx`

**O que o candidato vê hoje:** navbar bespoke (avatar + Sair), título desktop-scale "Dashboard de Candidato" (text-5xl), 6 tiles de contagem por *status*, 6 chips de filtro, e cards de candidatura com: título da vaga, badge de status colorido, linha "Etapa atual: {label}", um bloco "Próximo passo" com CTA único, e (condicionalmente) o card LGPD "Entenda a decisão". Clicar no corpo do card navega para a página pública da vaga (`handleVerVaga`, `:313`).

**Momento emocional:** é a tela que o candidato abre todo dia depois de submeter algo — ansioso, procurando UMA resposta: *"mexeu? com quem está a bola? quanto falta?"*. Cada visita sem mudança visível é um depósito na conta da desistência. E como nenhum e-mail chega (promessa fantasma já mapeada), esta tela é o **único** canal de comunicação do sistema — carga que ela não foi desenhada para carregar.

**Fricções e furos (estendendo 1.6 e a avaliação):**

1. **Os 6 tiles e 4 dos 6 filtros estão mortos por construção.** `useCandidaturasCount` (`src/features/vagas/hooks/useCandidaturas.ts:402-433`) conta a coluna `status` — que nenhum caminho M2 escreve depois do submit (fixa `aguardando_resposta`). "Em Análise (0)", "Aprovadas (0)" e "Finalizadas (0)" ficam congelados para sempre, mesmo com a etapa avançando até `aprovado`. Os filtros correspondentes (`:237-241`) retornam listas vazias — o candidato aprovado que clica "Aprovadas" vê "Nenhuma candidatura neste filtro".
2. **Contradição no card mais feliz:** um candidato com `etapa_atual='aprovado'` continua com badge azul "Aguardando Resposta" (`getStatusInfo`, `:66-81` lê `status`), enquanto a linha de baixo diz "Etapa atual: Aprovado". Duas colunas, duas verdades.
3. **Sem "última atualização" nem timeline — mas o dado já é legível.** `historico_candidatura` tem policy `candidato_le_proprio_historico` (migration `20260607000006_rls_policies_m2_backbone.sql:60-71`) e **zero** consumidores de UI candidato (grep: só `triagemService`). O "mexeu ou não mexeu?" que o candidato vem checar já está no banco, com timestamp, acessível com a sessão dele — falta só renderizar.
4. **O clique no card leva ao lugar errado.** Durante a espera, tocar no card abre a página pública da vaga (`:313`) — marketing que ele já leu — em vez de detalhe da *candidatura*.
5. **Botão-fantasma "Acompanhar candidatura"** (já registrado na avaliação): nas 5 de 8 etapas com `rotaCandidato: null` (`funilNavMap.ts:72-113`), renderiza-se um botão glass com seta cujo onClick é no-op (`:383-397`). O detalhe novo: o *rótulo* nunca diz o que está acontecendo — a etapa "entrevista_online" produz o mesmo botão morto que "triagem".

**Redesenho proposto** — o card vira um organismo de espera: mini-stepper, "com quem está a bola", última movimentação (de `historico_candidatura`) e prazo esperado:

```
┌──────────────────────────────────────┐
│ ≡  Beauty Smile      Olá, Ana ▾      │
├──────────────────────────────────────┤
│  Minhas candidaturas                 │
│                                      │
│ ╭─ glass ──────────────────────────╮ │
│ │ ASB — Unidade Moema              │ │
│ │                                  │ │
│ │  ●──●──◉──○──○──○                │ │
│ │  Inscr Tri Aval Entr Dec Fim     │ │
│ │        ▲                         │ │
│ │  Você está em: Avaliação         │ │
│ │                                  │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │ 🟢 Sua vez de agir           │ │ │
│ │ │ Falta 1 de 3 avaliações      │ │ │
│ │ │ [ Continuar avaliação →]     │ │ │
│ │ └──────────────────────────────┘ │ │
│ │                                  │ │
│ │ Última movimentação: há 2 dias   │ │
│ │ ("Você avançou para Avaliação") │ │
│ │ Prazo típico desta etapa: ~5 dias│ │
│ ╰──────────────────────────────────╯ │
│                                      │
│ ╭─ glass ──────────────────────────╮ │
│ │ Recepção — Unidade Pinheiros     │ │
│ │  ●──◉──○──○──○──○                │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │ ⏳ Com a nossa equipe        │ │ │
│ │ │ Estamos analisando seu       │ │ │
│ │ │ perfil. Você não precisa     │ │ │
│ │ │ fazer nada agora.            │ │ │
│ │ └──────────────────────────────┘ │ │
│ │ Última movimentação: hoje, 09h14 │ │
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Um indicador só:** derivar tudo de `etapa_atual` + `funilNavMap` (aposentar `status` da UI do candidato; os tiles do topo saem ou passam a contar por etapa). O bloco de ação tem 2 estados mutuamente exclusivos: `🟢 Sua vez` (rota existe → botão turquesa) e `⏳ Com a nossa equipe` (rota null → texto de status, **sem** affordance de botão).
- **`useHistoricoCandidatura(candidaturaId)`** novo hook (SELECT own-row já autorizado pela RLS) alimentando "Última movimentação" — a resposta direta ao motivo nº 1 da visita. Custo ~zero de backend.
- **Prazo esperado por etapa** como campo configurável da vaga (`vagas.prazos_etapas jsonb`, default por template de cargo) — copy sempre "típico/estimado", nunca compromisso.
- Clique no corpo do card → expandir/detalhe da candidatura (stepper + histórico), não a página pública da vaga.

### 3.2 — As salas de espera pós-envio (o mesmo momento, 4 telas)

> São as mesmas superfícies detalhadas individualmente em **2.1, 2.5, 2.6 e 2.7** — aqui tratadas como um único momento emocional, com um componente compartilhado como solução.

**Rotas + arquivos:**
- Hub "Tudo concluído!": `/candidato/avaliacao/:id` — `src/features/avaliacao/components/AvaliacaoContainer.tsx:163-170`
- "Redações concluídas.": `RedacaoEditorScreen.tsx:272-286`
- "Prova registrada.": `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx:82`
- Devolutiva pendente: `/candidato/avaliacao/:id/bigfive/devolutiva` — `DevolutivaBigFiveView.tsx:114-133`

**O que o candidato vê hoje:** quatro variações do mesmo beco: check turquesa + "Avisaremos sobre os próximos passos por e-mail" (e-mail que não existe — já mapeado). O all-done do hub não tem **nenhum CTA** (nem "Voltar ao painel"); a devolutiva pendente diz "Volte em alguns instantes" sem polling e seu botão "Voltar ao painel" na verdade volta ao **hub de avaliação** (`navigate('/candidato/avaliacao/…')`, `:125`), não ao dashboard.

**Momento emocional:** é o pico de investimento da jornada — o candidato acabou de dar 30-50 minutos (120 itens + redação). Ele está fisicamente cansado e emocionalmente aberto: é O momento de reciprocidade. O sistema responde com um beco sem saída e uma promessa falsa. A ansiedade pós-envio ("será que salvou? e agora?") é a mais barata de tratar — e a mais cara de ignorar.

**Fricções e furos (além do já registrado):**
1. O all-done é hoje **inalcançável** de qualquer forma (cards nunca viram "Concluído" — raiz M7/H15, já mapeada), mas quando for consertado, o estado que vai receber o candidato é um beco: sem CTA, sem prazo, sem "o que acontece agora" (`AvaliacaoContainer.tsx:163-170`).
2. Nenhuma das 4 telas diz **o que acontece com o material enviado** ("uma pessoa do RH vai revisar") — informação que reduz ansiedade e é verdadeira (a redação tem revisão humana obrigatória; contar isso é diferencial, não risco).
3. A devolutiva — o único "presente" do funil — não tem `refetchInterval` nem link de retorno de nenhuma outra tela (já mapeado); acrescento: o empty state não diferencia "gerando" de "falhou para sempre" (EF comprovadamente estoura timeout), então o candidato pode voltar 10 vezes ao mesmo "instantes".

**Redesenho proposto** — um componente único `EsperaPosEnvio` usado nas 4 telas:

```
┌──────────────────────────────────────┐
│ ← Voltar ao painel                   │
├──────────────────────────────────────┤
│ ╭─ glass ──────────────────────────╮ │
│ │            ✓ (turquesa)          │ │
│ │      Tudo enviado, Ana!          │ │
│ │                                  │ │
│ │  Suas respostas foram salvas     │ │
│ │  com segurança.                  │ │
│ │                                  │ │
│ │  O que acontece agora            │ │
│ │  ────────────────────            │ │
│ │  1. Uma pessoa da nossa equipe   │ │
│ │     revisa suas avaliações       │ │
│ │  2. Você acompanha tudo pelo     │ │
│ │     seu painel                   │ │
│ │  3. Prazo típico: até 5 dias     │ │
│ │     úteis                        │ │
│ │                                  │ │
│ │  [ Acompanhar no painel → ]      │ │
│ │                                  │ │
│ │  🎁 Seu perfil comportamental    │ │
│ │  está sendo preparado — um       │ │
│ │  retorno nosso pelo seu tempo.   │ │
│ │  ⏳ Gerando… (~2 min)            │ │
│ │  [ Ver quando pronto ]           │ │
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Copy honesta imediata (S):** trocar "Avisaremos por e-mail" nas 4 telas por "Acompanhe pelo seu painel" + CTA "Acompanhar no painel →" (dashboard, não hub). No `ProvaCognitivaScreen` COPY.postSubmit idem.
- **"O que acontece agora" com revisão humana explícita** — transforma o requisito LGPD (revisão por pessoa natural) em copy que acalma: "uma pessoa da nossa equipe revisa".
- **Devolutiva com 3 estados:** `gerando` (refetchInterval 10s por 5 min, com barra indeterminada), `pronta` (card 🎁 vira link permanente também no dashboard), `demorando` (>5 min: "Está demorando mais que o normal — ela aparecerá no seu painel assim que ficar pronta", e para o polling). Nunca "volte em instantes" cego.

### 3.3 — A entrevista que não existe (lado do candidato)

**Rota + arquivo:** **nenhum.** `funilNavMap.ts:93-105` — `entrevista_online` e `entrevista_presencial` têm `rotaCandidato: () => null`. Não há componente, não há rota em `routes.tsx`. `entrevista_agendada_em` vive na tabela **vagas** (um horário para a vaga inteira) e não tem nenhum write-path (já mapeado do lado RH).

**O que o candidato vê hoje:** o card do dashboard com "Etapa atual: Entrevista online" e o botão-fantasma "Acompanhar candidatura". Data, horário, link do Meet, com quem vai falar, o que levar, como se preparar — **tudo isso chega por WhatsApp fora do sistema**, sem registro. Se ele perder a mensagem, o sistema não tem como reexibi-la.

**Momento emocional:** é o momento de maior stake pessoal da jornada — a única etapa síncrona, com hora marcada e julgamento face a face. O medo dominante é logístico-social: *"e se eu errar o horário? o link? com quem eu falo? o que vestir numa clínica odontológica?"*. Um no-show por informação perdida custa a vaga para o candidato e o slot para o RH — e o PRD já mede no-show como métrica.

**Fricções e furos:**
1. A etapa mais crítica é a única **sem superfície nenhuma** — nem read-only. O candidato regride ao WhatsApp justamente no ponto em que o produto prometia rastreabilidade.
2. O marker 24h do lado RH (`EntrevistaDashboard`) já foi construído e está morto por falta do write de agendamento — a mesma coluna, movida para `candidaturas` e escrita numa UI RH simples, destrava os **dois** lados.
3. Não existe canal de "imprevisto": se o candidato precisa remarcar, a única saída é sumir (vira no-show estatístico).

**Redesenho proposto** — `/candidato/entrevista/:candidaturaId` (read-mostly, mesma shell glass):

```
┌──────────────────────────────────────┐
│ ← Voltar ao painel                   │
├──────────────────────────────────────┤
│ ╭─ glass ──────────────────────────╮ │
│ │  Sua entrevista online           │ │
│ │  ASB — Unidade Moema             │ │
│ │                                  │ │
│ │  ┌────────────────────────────┐  │ │
│ │  │ 📅 Ter, 14 de julho        │  │ │
│ │  │ 🕐 14h30 (horário de SP)   │  │ │
│ │  │ 👤 Com: Dra. Carla (RH)    │  │ │
│ │  │ ⏱  Duração: ~40 min        │  │ │
│ │  └────────────────────────────┘  │ │
│ │                                  │ │
│ │  [ ▶ Entrar na chamada ]         │ │
│ │   (ativo 15 min antes)           │ │
│ │  [ + Adicionar à agenda (.ics) ] │ │
│ │                                  │ │
│ │  Como se preparar                │ │
│ │  ──────────────────              │ │
│ │  ✓ Teste câmera e microfone      │ │
│ │  ✓ Escolha um lugar silencioso   │ │
│ │  ✓ Tenha seus documentos à mão   │ │
│ │  ✓ Conversa sobre sua trajetória │ │
│ │    — sem pegadinhas              │ │
│ │                                  │ │
│ │  Imprevisto?                     │ │
│ │  [ Preciso remarcar ]            │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│  (sem horário definido ainda:)       │
│ ╭─ glass ──────────────────────────╮ │
│ │ ⏳ Estamos agendando sua         │ │
│ │ entrevista. Os detalhes          │ │
│ │ aparecerão aqui e você verá      │ │
│ │ um aviso no painel.              │ │
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/estado:**
- **Pré-requisito (compartilhado com o achado RH):** mover `entrevista_agendada_em` (+ `entrevista_link`, `entrevista_local`) para `candidaturas`, write RH-scoped no EntrevistaWorkspace. Allowlist de leitura own-row para o candidato (data/link/local apenas — nunca guia, scorecard ou transcrição: RNF-07a).
- `funilNavMap.entrevista_*.rotaCandidato` → esta rota; o CTA do dashboard vira "Ver detalhes da entrevista". Dois estados: agendada (mockup principal) e aguardando agendamento (bloco inferior).
- Botão da chamada com gate temporal (habilita −15 min) para eliminar o erro "entrei no dia errado". `.ics` gerado client-side (zero infra).
- "Preciso remarcar" grava um evento em `historico_candidatura` + webhook para o RH — não é self-service de calendário (MS Bookings segue Future), é só **não perder o sinal** do candidato.
- Presencial: mesma tela trocando link por endereço da unidade + mapa; checklist adaptado ("chegue 10 min antes").

### 3.4 — A rejeição: card "Entenda a decisão" + ExplicacaoCandidatoPage

**Rotas + arquivos:** card no dashboard (`DashboardCandidatoPage.tsx:400-434`, gate `hasDecisaoFinal` `:132-141`) → `/candidato/explicacao/:id` — `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx` + `explicacaoService.ts` + `SolicitarRevisaoCTA.tsx`.

**O que o candidato vê hoje (quando chega):** uma página genuinamente digna — "Sobre a sua candidatura", frase de resultado respeitosa, bloco "Por que esta decisão" com razão templada, direito de revisão por pessoa natural com confirm dialog e idempotência. É o melhor artefato de compliance do produto (a avaliação já elogiou). O problema é **chegar** nela e o que acontece **depois** dela.

**Momento emocional:** o candidato acabou de ser rejeitado. Ele oscila entre dor, raiva e busca de sentido ("o que eu fiz de errado?"). Uma explicação genérica lida nesse estado soa como carta-padrão — e o direito de "solicitar revisão" que nunca responde vira sal na ferida.

**Fricções e furos (achados novos deste walkthrough):**

1. **O gate do card LGPD está invertido.** `hasDecisaoFinal` exige `data_decisao_final || feedback_rejeicao` (`DashboardCandidatoPage.tsx:140`) — mas **nada no M2 escreve `data_decisao_final`**: `registrar_decisao` grava só `etapa_atual` (migration `20260625100001_decisao_final_phase15.sql:140-142`; grep de writers em `src/` + `migrations/` = zero). Resultado perverso:
   - **Knockout (etapa 1)** seta `feedback_rejeicao` → card "Entenda a decisão" **aparece** → clique → `explicacaoService` lê `decisao_final`, não há row → **"Esta página não está disponível."** O candidato rejeitado recebe um convite formal de transparência que termina em porta fechada.
   - **Rejeição na decisão final** (o único caso em que a página funciona) → nem `data_decisao_final` nem `feedback_rejeicao` no row da candidatura → **card nunca aparece**. O único caminho é o step-CTA.
2. **O step-CTA da rejeição diz "Continuar para Rejeitado"** — o template genérico `Continuar para ${label}` (`funilNavMap.ts:126`) aplicado a uma etapa terminal. "Continuar para Rejeitado", em turquesa de ação positiva, é a pior frase possível do produto no pior momento possível.
3. **A "explicação" Art. 20 é a mesma para todos.** `REASON_BY_DECISAO` (`explicacaoService.ts:142-156`) é um parágrafo fixo — a `justificativa` do RH é lida pela allowlist mas deliberadamente nunca derivada. Defensável juridicamente como piso, mas o "direito à explicação" hoje explica *o processo*, não *a decisão*. Não é preciso vazar a justificativa crua: basta um campo estruturado na decisão (ex.: `dimensao_principal` de um vocabulário fechado e neutro) para templar 1 frase específica.
4. **A revisão é um loop sem volta.** `revisao_resultado` não tem write-path em lugar nenhum (grep: só a coluna em `20260607000003:47` e a leitura na página) — não há fila de revisões no RH, nem tela, nem RPC. O dialog promete "Avisaremos você sobre o resultado" (`SolicitarRevisaoCTA.tsx:45`) — segunda promessa fantasma, agora com peso jurídico: o Art. 20 registrado e nunca respondido é pior evidência do que não oferecer o botão. E o webhook de notificação vai para n8n pessoal fire-and-forget.
5. Depois de solicitar, o candidato não vê **prazo nem estado** ("recebida → em análise → respondida") — só o botão desabilitado com tooltip (tooltip em touch: invisível).

**Redesenho proposto** — explicação com 1 grau de especificidade + loop de revisão com estado:

```
┌──────────────────────────────────────┐
│ ← Voltar ao painel                   │
├──────────────────────────────────────┤
│ ╭─ glass ──────────────────────────╮ │
│ │  Sobre a sua candidatura         │ │
│ │  ASB — Unidade Moema             │ │
│ │                                  │ │
│ │  Após avaliar seu processo,      │ │
│ │  decidimos não seguir com sua    │ │
│ │  candidatura nesta vaga.         │ │
│ │                                  │ │
│ │  POR QUE ESTA DECISÃO            │ │
│ │  A decisão foi tomada por uma    │ │
│ │  pessoa da nossa equipe, com     │ │
│ │  base no conjunto das etapas.    │ │
│ │  O fator de maior peso foi a     │ │
│ │  [experiência prática exigida    │ │
│ │  para esta vaga].  ← templado    │ │
│ │                                  │ │
│ │  Isso não é um julgamento sobre  │ │
│ │  seu valor profissional.         │ │
│ │                                  │ │
│ │  SEUS DIREITOS (LGPD, Art. 20)   │ │
│ │  ┌────────────────────────────┐  │ │
│ │  │ ✓ Revisão solicitada       │  │ │
│ │  │   em 02/07                 │  │ │
│ │  │ ● Em análise pela equipe   │  │ │
│ │  │ ○ Resposta — até 10 dias   │  │ │
│ │  │   úteis (aqui no painel)   │  │ │
│ │  └────────────────────────────┘  │ │
│ │                                  │ │
│ │  E AGORA?                        │ │
│ │  Outras vagas combinam com       │ │
│ │  seu perfil:                     │ │
│ │  [ Ver vagas de ASB → ]          │ │
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- **Consertar o gate (S, prioridade máxima):** `hasDecisaoFinal` deve refletir onde a página funciona — mostrar o card quando existir row own-row em `decisao_final` (ou: `registrar_decisao` passa a carimbar `data_decisao_final` na candidatura). Para knockout, o card não deve rotear para a explicação vazia: ou a rejeição de etapa 1 ganha um branch próprio na página ("decisão por critério objetivo da vaga, definido antes de qualquer avaliação"), ou o card não aparece e o feedback inline do dashboard basta.
- **CTA terminal com copy própria:** `funilNavMap` ganha `ctaCandidato` específico por etapa terminal — rejeitado: "Entenda a decisão" (neutro, não turquesa-ação); nunca "Continuar para Rejeitado".
- **Razão com 1 grau de especificidade:** `registrar_decisao` ganha parâmetro opcional `dimensao_principal` (enum fechado: experiência prática, disponibilidade de horário, alinhamento com a função, momento da vaga…) → template determinístico por dimensão. Nenhum score/banda cruza (RNF-07a intacto); "decidida por uma pessoa da nossa equipe" explicitada — é verdade e é o Art. 20.
- **Fechar o loop de revisão:** (a) tela/fila RH "Revisões solicitadas" + RPC `responder_revisao` que escreve `revisao_resultado` (com autor + timestamp); (b) stepper de estado na página do candidato (recebida → em análise → respondida) + SLA visível; (c) até existir (a), trocar a copy do dialog: "Sua solicitação fica registrada e será revisada por uma pessoa da equipe. Acompanhe a resposta nesta página."
- **Re-engajamento digno:** bloco "E agora?" com link filtrado para vagas do mesmo cargo — transforma o fim de UM funil em permanência no banco de talentos (hoje a rejeição é também o fim da relação com a marca).

### 3.5 — A aprovação: silêncio no final feliz

**Rota + arquivo:** **nenhum.** `funilNavMap.aprovado.rotaCandidato: () => null` (`funilNavMap.ts:117`). O template `aprovado` até existe no service ("Avaliamos seu processo e seguiremos com a sua candidatura…", `explicacaoService.ts:152-153`) mas o reachability gate (`:206`) o torna código morto — nenhuma superfície o renderiza.

**O que o candidato vê hoje:** o card do dashboard com badge **"Aguardando Resposta"** (status nunca atualizado), linha "Etapa atual: Aprovado" em texto 70% de opacidade, e o botão-fantasma "Acompanhar candidatura". Se `data_decisao_final` fosse escrito, ele veria o card "Entenda a decisão sobre sua candidatura" → "Ver explicação" → **"Esta página não está disponível."** — o gate `etapasDecisao` inclui `'aprovado'` (`DashboardCandidatoPage.tsx:133-137`) mas a página só existe para rejeição. O momento de maior alegria do funil está a um clique de uma tela de erro.

**Momento emocional:** ele passou por 6 etapas, semanas de espera, 120 perguntas e uma redação — e **foi aprovado**. É o pico absoluto de emoção positiva da relação com a marca empregadora, o momento que ele vai contar para a família. O sistema responde com uma linha de texto cinza e um badge que diz "Aguardando".

**Fricções e furos:**
1. Zero celebração, zero instrução: não há "parabéns", não há "próximos passos" (documentos, exame admissional, data de início, com quem falar) — o onboarding inteiro acontece fora do sistema, no WhatsApp.
2. A cadeia badge/etapa/CTA se contradiz três vezes no card mais importante (item 2 da Tela 3.1).
3. O convite "Entenda a decisão" para aprovado → beco "não está disponível" (interseção do gate `:133-137` com o `:206` do service).

**Redesenho proposto** — `/candidato/aprovado/:candidaturaId` (ou estado dedicado do card):

```
┌──────────────────────────────────────┐
│ ╭─ glass ──────────────────────────╮ │
│ │            🎉                    │ │
│ │   Parabéns, Ana!                 │ │
│ │   Você foi aprovada para         │ │
│ │   ASB — Unidade Moema            │ │
│ │                                  │ │
│ │  ●──●──●──●──●──✓                │ │
│ │  (jornada completa, turquesa)    │ │
│ │                                  │ │
│ │  PRÓXIMOS PASSOS                 │ │
│ │  ┌────────────────────────────┐  │ │
│ │  │ 1. Nossa equipe entra em   │  │ │
│ │  │    contato em até 2 dias   │  │ │
│ │  │    úteis                   │  │ │
│ │  │ 2. Envio de documentos     │  │ │
│ │  │ 3. Definição da data de    │  │ │
│ │  │    início                  │  │ │
│ │  └────────────────────────────┘  │ │
│ │                                  │ │
│ │  Dúvidas? Fale com o RH:         │ │
│ │  [ 💬 WhatsApp ]  [ ✉ E-mail ]   │ │
│ │                                  │ │
│ │  🎁 Reveja seu perfil            │ │
│ │  comportamental →                │ │
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```

**Mudanças de fluxo/copy/estado:**
- `funilNavMap.aprovado.rotaCandidato` → esta rota; CTA do card: **"Ver próximos passos"** (turquesa, merecido aqui). Badge do card: "Aprovada ✓" neutro-positivo — e o gate LGPD deixa de incluir `aprovado` (ou a página ganha o branch aprovado que o template morto já escreveu).
- Conteúdo de próximos passos como template por cargo (config leve na vaga), com contato do RH real — é o único lugar onde `mailto:`/`wa.me` é a solução certa e suficiente.
- Link permanente para a devolutiva Big Five — fechar a jornada devolvendo o "presente" no momento de maior receptividade.

---

## Top 10 mudanças da jornada (severidade × esforço)

| # | Mudança | Tela âncora | Sev. | Esforço | Por quê nesta ordem |
|---|---------|-------------|------|---------|---------------------|
| 1 | **Rascunho + leave-guard no formulário de candidatura** (`useCandidaturaDraft` espelhando o padrão do cadastro) | 1.8 Formulário | Crítica | M | O maior risco de perda de trabalho pré-funil: back-gesture = 20 min perdidos em silêncio. O padrão já existe pronto no cadastro. |
| 2 | **Hidratar drafts no mount + autosave no SJT MC** (sessionStorage → fallback servidor; acumular `_elapsed` no draft) | 2.2–2.4, 2.6 Avaliações | Crítica | M | Único fix que salva o candidato interrompido — o modo de falha nº 1 do mobile. O dado já está no servidor; falta só ler. |
| 3 | **Status real dos cards + estado "Rascunho salvo" + retomada no hub** | 2.1 Hub | Alta | M | Sem ele, o fix #2 fica invisível ("continua Pendente") e o hub nunca vira ponto de retomada. |
| 4 | **Varredura de copy: e-mail fantasma (4+ telas), "revisar" falso da redação, fallback "~10 min", "Continuar para Rejeitado"** | 3.2 Salas de espera (âncora) | Alta | S | Promessas quebradas custam mais que ausência de promessa. Zero migration; para de mentir hoje. |
| 5 | **Consertar o gate invertido do card LGPD** (mostrar quando existe row em `decisao_final`; branch próprio p/ knockout) | 3.4 Explicação | Alta | S | Bug de dignidade com exposição jurídica: convite formal de transparência que termina em "página não disponível". |
| 6 | **Propagar `?redirect=` na cadeia vaga → login/cadastro → formulário** (bottom-sheet no detalhe + pós-cadastro navega ao redirect) | 1.3 Detalhe da vaga | Alta | S | Preserva a intenção no pico de motivação; hoje ela se perde em três elos. |
| 7 | **Dashboard sala de espera:** stepper por card + "Com a nossa equipe" no lugar do botão morto + "Última movimentação" via `historico_candidatura` (RLS já permite) | 3.1 / 1.6 Dashboard | Alta | M | O painel é o único canal do sistema; responde "mexeu? com quem está a bola? quanto falta?" — e mata os tiles mortos e o vermelho "Rejeitadas". |
| 8 | **Cadastro em 2 steps + banner de contexto da vaga** (endereço/disponibilidade pós-candidatura) | 1.5 Cadastro | Alta | M | Corta o custo pago adiantado no pico de motivação; o knockout não usa nenhum dos campos removidos. |
| 9 | **Ack imediato no envio com IA** (persistir → confirmar; avaliação em background; nunca pedir retry do que já está salvo) | 2.3 Caso prático / 2.6 Redação | Média | M | Mata o spinner de 38-102s no 4G e o retry pago injusto. |
| 10 | **Devolutiva Big Five: 3 estados + polling + link permanente no painel** (gerar no submit, não on-demand) | 2.5 Devolutiva | Média | S | Recupera o único momento de reciprocidade do produto. |

**Próximas da fila (não menos reais):** prova cognitiva alcançável + intro-gate (2.7, S — uma linha de mapa destrava a feature); tela do aprovado (3.5, M — pico emocional hoje entregue como bug); fila RH + `responder_revisao` fechando o loop Art. 20 (3.4, M — direito registrado e não respondido é passivo jurídico); tela de entrevista do candidato (3.3, M — destrava no-show e o marker 24h do RH).

---

## Fechamento — as 3 mudanças que mais reduzem desistência

**1. Persistência universal com retomada visível (mudanças #1 + #2 + #3).** O candidato real é interrompido — pelo chefe atual, pela notificação, pelo Android matando a aba. Hoje, cada interrupção no formulário de candidatura, no SJT ou no item 58 do Big Five custa *todo* o trabalho, silenciosamente, sob um selo "Salvo automaticamente" que não restaura nada. Rascunho + hidratação no mount + "Continuar de onde parei" no hub transformam o modo de falha nº 1 do mobile em um não-evento. É a única família de mudanças que salva trabalho já investido — e trabalho investido é o que segura a pessoa no funil.

**2. A intenção da vaga viaja com o candidato (mudanças #6 + #8).** Entre o clique em "Candidatar-se" e o envio do formulário existem hoje um toast de erro, uma tela de login que não é para ele, quatro steps de cadastro sem menção à vaga e um dashboard vazio — a intenção morre de frio no caminho. Bifurcação digna no detalhe da vaga, `?redirect=` propagado até o pós-cadastro, banner "Candidatura: ASB — Curitiba" durante a conta e aterrissagem direta no formulário fazem o pico de motivação chegar inteiro ao único lugar onde ele importa.

**3. A espera vira produto (mudanças #4 + #7).** ~90% da jornada em tempo de calendário é espera, e hoje ela é servida por promessas de e-mails que não existem, botões que não fazem nada e contadores congelados em zero. Assumir o painel como canal único — copy honesta ("acompanhe por aqui"), stepper de etapas, "última movimentação" (dado que a RLS já entrega), prazo típico e o estado explícito "Com a nossa equipe — você não precisa fazer nada" — converte a ansiedade de cada visita em confiança. Candidato que confia no painel volta; candidato que desconfia some — e leva a marca empregadora junto.