---
phase: 43
slug: consentimentos-honestos-pol-tica-de-reten-o
status: approved
verified_by: gsd-ui-checker 2026-08-01 — 6 dimensoes, 5 PASS + 1 FLAG (escopo do grep), FLAG corrigido nesta versao
shadcn_initialized: true
preset: existing project install (shadcn/ui + Radix; tokens em src/styles/globals.css; primitivos vendorizados em src/components/ui/ desde o M1)
created: 2026-08-01
persona: candidato (mobile-first — passo de autorizações do cadastro, página nova de autorizações no painel, 2 sítios de copy do Art. 20) + administrador (desktop-first — matriz de retenção e prévia read-only) + RH (1 sítio de copy do Art. 20)
---

# Phase 43 — UI Design Contract

> Contrato visual e de interação de **Consentimentos Honestos & Política de Retenção**.
> Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

## Esta fase é um contrato de COPY vestido de UI

O rótulo de um checkbox de consentimento **é** a base legal a que a pessoa consentiu. Copy vaga
aqui não é problema de estilo: torna o consentimento juridicamente mais fraco e o registro
não-verificável. Por isso a §Copywriting desta spec recebe o mesmo rigor que a 42-UI-SPEC deu à
cobertura de estados — e por isso ela vem **antes** de qualquer escolha estética na ordem de
importância, ainda que apareça depois na ordem de leitura.

**Consequência mecânica, e ela é o núcleo da fase:** o CONSENT-02 grava **versão + hash + timestamp
do texto lido**. Logo **as strings desta spec são a entrada do hash**. Mudar uma vírgula muda o
hash e cunha uma versão nova de consentimento. Um executor que "melhore" a redação sem bump de
versão produz linhas cujo hash não corresponde a texto nenhum — o defeito exato que a fase existe
para tornar impossível.

---

## Escopo desta UI-SPEC

Dos 11 requirements da fase, **8 têm superfície visual**. Esta spec **não** inventa UI para os demais.

| Requirement | Superfície | Natureza |
|-------------|-----------|----------|
| **CONSENT-01** | `AutorizacoesStep` — os opcionais nascem **desmarcados** | Edição de tela existente |
| **CONSENT-02** | Versão do texto de consentimento visível ao candidato (a legenda de versão do passo) | Edição de tela existente |
| **CONSENT-03** | `autorizacao_comunicacao` → **linha informativa** (transacional, Art. 7º, V) + **checkbox** (marketing) | Edição de tela existente |
| **CONSENT-04** | `/candidato/privacidade` — revogação do marketing | **Net-new** (rota nova, mobile-first) |
| **CONSENT-05** | `autorizacao_analise_video` **sai do formulário e da copy** (BD-2) | Remoção em tela existente |
| **RETEN-01/02** | `/admin/retencao` — matriz de retenção editável sem deploy + banner do seed | **Net-new** (rota nova, desktop-first) |
| **RETEN-03** | `autorizacao_retencao_curriculo` citado por candidato como base legal da guarda do currículo | Bloco de `/candidato/privacidade` |
| **RETEN-04** | Prévia **read-only** "estes N candidatos seriam afetados" | Bloco de `/admin/retencao` |
| **BD-3** | 3 sítios vivos de copy do Art. 20 reescritos em linguagem simples | Edição de copy |
| CONSENT-06 | Click tracking desligado no Resend (código da EF + verificação no painel do provedor) | **Sem UI** — ver §Regra do rodapé de e-mail |
| RETEN-06 | Veredito registrado sobre reusar (ou não) o `retain_until` de `ai_call_logs` | **Sem UI** — artefato datado |

**Binding upstream:** `43-CONTEXT.md` (BD-1/BD-2/BD-3 **travadas**), `.planning/REQUIREMENTS.md`
(CONSENT-01..06, RETEN-01..04/06), `.planning/ROADMAP.md` §Phase 43 (5 critérios de sucesso),
`42-UI-SPEC.md` (escala, tipografia, cor e o método herdados verbatim).

**Reuse-first:** esta fase **não** introduz token novo, shell novo, primitivo novo nem dependência
npm nova. Compõe o shell glass-over-gradient do candidato e o `RHLayout` + `GlassCard` do
RH/admin, ambos travados desde o M1.

---

## Invariantes não-negociáveis desta fase

Precedem qualquer escolha estética. Um plano que os viole está errado mesmo que fique bonito.

1. **Nunca prometer o que nenhum código executa.** É a regra herdada da 42-UI-SPEC e é a razão de
   ser deste milestone inteiro: os consentimentos foram coletados e nunca lidos. Consequências
   diretas e verificáveis nesta fase:
   - O texto vivo em `AutorizacoesStep.tsx:91-93` diz que o titular pode "acessar, corrigir,
     excluir ou revogar qualquer autorização … **através do nosso portal**". Esse portal **não
     existe**. Depois desta fase existe **um pedaço** dele (revogar marketing). Acessar (Phase 44)
     e excluir (Phase 45) **continuam sem código**. A copy tem de dizer exatamente isso — ver
     §Regra do canal honesto.
   - **Nenhuma superfície de candidato desta fase pode usar futuro de máquina sobre exclusão.**
     Proibidas, em texto visível, em `title`, em `aria-label` e em e-mail: `automaticamente`,
     `será excluído`, `serão apagados`, `exclusão automática`. Nada apaga dado de candidato hoje.
   - Nenhum botão de `/admin/retencao` pode carregar verbo destrutivo (`Purgar`, `Executar`,
     `Apagar agora`, `Limpar`). A fase é **zero-destrutiva por desenho** e a UI declara isso.
2. **O rótulo é a base legal — e as strings desta spec são a entrada do hash.** Ver o bloco de
   abertura. Toda string de consentimento renderizada vive em um `const` nomeado, não inline no
   JSX, para que o hash tenha uma fonte única e grep-ável.
3. **A assimetria transacional × marketing tem de ser legível sem virar dark pattern.**
   O transacional **não é consentimento**: a base é o Art. 7º, V (execução de procedimentos
   preliminares). Por isso ele **não é renderizado como checkbox nem como switch**. Um controle que
   a pessoa não pode desligar é a forma mais pura da doença deste milestone. Ele é uma **linha
   informativa**, fora do `fieldset` de escolhas, com a base legal nomeada. O marketing é um
   checkbox de verdade, desmarcado, revogável, com o caminho de revogação nomeado no próprio texto.
4. **Zero fricção para revogar.** A revogação do marketing **nunca** é gatilhada por diálogo de
   confirmação, nunca pede motivo, nunca oferece "tem certeza? você vai perder oportunidades".
   Fricção sobre o exercício de um direito é dark pattern. Conceder é que exige o texto integral
   visível (e é por isso que ele fica sempre ao lado do controle).
5. **Proibida UI otimista em escrita de consentimento.** O controle reflete **apenas** estado
   confirmado pelo servidor; em voo fica desabilitado com indicador de pendência; em falha volta ao
   estado do servidor **e** mostra erro. Uma UI dizendo "revogado" enquanto o servidor diz
   "concedido" é o defeito central do milestone em miniatura.
6. **2 anos é teto consentido, nunca recomendação técnica.** Onde o número aparecer — na copy do
   cadastro, na página do candidato, no banner do admin — ele é apresentado como *o que a pessoa
   leu e aceitou*. O banner do `/admin/retencao` é **sempre visível** e nunca colapsável
   (precedente do banner de limitação do `BiasAuditPage`, T-15-18).
7. **Allowlist de colunas em toda leitura.** Nunca `select('*')` ([[reference_select_star_leaks_pii]]).
   `/candidato/privacidade` é own-row; `/admin/retencao` lê agregado, **nunca** identifica candidato
   na prévia (ver §Prévia read-only).
8. **A frase que tem de morrer é "por pessoa natural".** BD-3 mira o juridiquês que o titular não
   decodifica. `solicitar` / `solicitação` **não** é juridiquês e permanece onde já lê bem —
   inclusive nos e-mails, que ficam **fora** do escopo desta fase. Critério de aceitação grep-ável:
   após esta fase, `grep -rn "pessoa natural" src/` retorna **zero** ocorrências em copy renderizada.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (instalação existente do projeto — **NÃO** re-inicializada; não há `components.json` na raiz; 50+ primitivos vendorizados em `src/components/ui/` desde o M1) |
| Preset | projeto já cabeado; tokens em `src/styles/globals.css`, primitivos em `src/components/ui/` |
| Component library | Radix (via shadcn/ui) |
| Icon library | lucide-react |
| Font | Helvetica Neue, Helvetica, Arial, sans-serif (`--font-family`) |

**Gate do shadcn — decisão registrada (idêntica à das Phases 7–17 e 42):** `components.json`
**ausente** e `npx shadcn init` **deliberadamente não executado**. Vários primitivos vendorizados
carregam imports com versão embutida (`@radix-ui/react-slot@1.1.2`) resolvidos por `resolve.alias`
no `vite.config.ts`; rodar o init reescreveria esses arquivos e quebraria o alias. Não é lacuna, é
o estado travado do projeto.

**Shell do candidato (mobile-first) — reusada verbatim, não re-autorada:**
`BackgroundImage background="gradient"` + overlay 15% + `container mx-auto px-4 max-w-2xl` +
`GlassPanel variant="white" blur="xl"`, exatamente o `ScreenShell` de
`ExplicacaoCandidatoPage.tsx:308-321`. `/candidato/privacidade` clona esse shell; o
`AutorizacoesStep` continua dentro do shell do cadastro, inalterado.

**Shell do admin (desktop-first) — reusada verbatim:** `RHLayout` (`BackgroundImage
background="darkBlue"` + `RHSidebar` + `RHTopBar` + `<main className="flex-1 p-4 lg:p-6">`) com
`GlassCard` por cima. Gêmeo estrutural direto: `BiasAuditPage` (`/admin/bias-audit`) — mesmo
banner-sempre-visível, mesma `Table`, mesmos estados loading/error/empty.

### Rotas novas

| Rota | Guard | Persona | Por quê aqui |
|------|-------|---------|--------------|
| `/candidato/privacidade` | `RoleGuard role="candidato"` | mobile-first | **Não** anexada a `/candidato/perfil`: a D-10 da Phase 17 estabeleceu que perfil é *dados pessoais + edição APENAS*, e a sobreposição CAND-DASH-DUP-01 foi removida de lá de propósito. Além disso esta rota é a **casa** que a Phase 44 (pedir cópia dos dados) e a Phase 45 (pedir exclusão) vão ocupar — criá-la aqui evita que cada fase invente a sua |
| `/admin/retencao` | `RoleGuard role="administrador"` | desktop-first | Família `/admin/*` já existente (`ai-logs`, `prompt-versions`, `ai-costs`, `bias-audit`), todas `administrador`-only. `/rh/configuracoes` foi rejeitada: hoje ela é integralmente o console de gestão de usuários, e enfiar a matriz lá exigiria tabs numa página que não tem nenhuma |

**Alcançabilidade — e ela é obrigatória, não cosmética.** Verificado no repositório: as 4 páginas
`/admin/*` existentes **não têm nenhum link cruzado**; a `RHSidebar` tem um item `admin` único,
cabeado fixo em `/admin/ai-logs`. Replicar isso entregaria uma matriz de retenção que só existe por
URL digitada. Esta fase corrige **localmente**, sem refatorar o menu:

- +1 `MenuItem` `retencao-admin` (`CalendarClock` 24px, rótulo **Retenção**), **gateado em
  `role === 'administrador'`** pelo mesmo idioma do item `admin` (D-13 — visibilidade é
  **cosmética**; quem controla acesso é o `RoleGuard` da rota).
- +1 linha em `getActivePageFromPath` **antes** da linha `startsWith('/admin')` (hoje
  `RHSidebar.tsx:102`). Sem essa ordem o `/admin` genérico rouba o match e o item nunca acende —
  a mesma armadilha que a Phase 42 documentou para `/rh/revisoes` × `/rh/vagas`.
- +1 entrada no mapa `routes` do `handleMenuClick` (`'retencao-admin': '/admin/retencao'`).

Entrada do candidato: um card de navegação em `MeuPerfilCandidatoPage` apontando para
`/candidato/privacidade`. **Não** um item novo na `CandidatoNavbar` — ela hoje tem exatamente um
link ("Área do candidato") e engordá-la é mudança de shell fora de escopo.

### Âncora visual primária (uma por tela — declarada, não inferida)

- **`AutorizacoesStep`:** **o cartão da autorização obrigatória continua sendo a âncora** — é o
  único bloco com tint azul, ícone `Shield` e badge "Obrigatório", e é o gate do submit. A mudança
  desta fase (linha informativa nova + 1 checkbox a menos) **não** disputa essa âncora: a linha
  informativa é visualmente mais leve que qualquer cartão de escolha (sem borda de ênfase, sem
  controle), justamente porque não é uma decisão que a pessoa toma.
- **`/candidato/privacidade`:** **a lista de autorizações é a âncora** — é o objeto maior e o único
  que responde à pergunta que traz a pessoa ali ("o que eu autorizei, e como desfaço?"). O H1 e o
  bloco "O que guardamos e por quê" são subordinados; o bloco de guarda do currículo vem **depois**
  da lista porque é leitura, não ação.
- **`/admin/retencao`:** **a tabela da matriz é a âncora.** O banner do seed fica acima dela,
  compacto, e a prévia read-only fica **abaixo** — a prévia é consequência do que a tabela diz, e
  colocá-la em cima inverteria a leitura. O H1 e o subtítulo não ganham card próprio.

**Primitivos shadcn em escopo (todos já vendorizados):** `checkbox`, `label`, `alert`, `switch`,
`table`, `dialog`, `alert-dialog`, `input`, `button`, `tooltip`, `skeleton`, `separator`, `badge`.
Sonner (`toast`) para feedback transitório.

**Componentes do projeto reusados (não re-autorar):**

| Componente | Papel nesta fase |
|-----------|------------------|
| `Glass` / `GlassPanel` / `GlassCard` / `GlassButton` (`src/components/ui/glass.tsx`) | Camada glass das duas telas novas. ⚠ `GlassButton` **descarta props não-estilo** (defeito corrigido no 42-11 / D-42-11-01) — conferir antes de contar com `aria-*` |
| `AsyncState` (`src/components/ui/AsyncState.tsx`) | Contrato único de loading/error/empty da matriz de retenção. Precedência travada: `isLoading → slow → isError → isEmpty → children`, copy sobrescrita por `copy={{...}}` |
| `BiasAuditPage` (`src/features/admin/bias-audit/`) | **Molde estrutural do `/admin/retencao`**: `RHLayout` + `GlassCard` + banner sempre visível + `Table` + estados. Copiar a estrutura, não o conteúdo |
| `FilaRevisoesTable` (`src/features/revisao/`) | Molde da `Table` glass: `overflow-x-auto rounded-xl border border-white/10`, header `TableRow className="border-white/10 bg-white/10"`, linhas `hover:bg-white/5`, ação à direita |
| `ExplicacaoCandidatoPage` `ScreenShell` | Shell mobile-first de `/candidato/privacidade`, clonada verbatim |
| `AutorizacoesStep` (`src/features/cadastro/components/steps/`) | **Editado**, nunca substituído |
| `SolicitarRevisaoCTA` · `ExplicacaoCandidatoPage` · `RegistrarDecisaoForm` | Editados **somente na copy** do Art. 20 (BD-3). Zero mudança de estrutura, estado ou props |
| `RHSidebar` (`src/components/RHSidebar.tsx`) | +1 `MenuItem` role-gated (3 sítios, idioma do 42-10) |

---

## Spacing Scale

Escala estabelecida (múltiplos de 4), idêntica às UI-SPECs aprovadas das Phases 11/13/14/15/34/42.
Nenhum valor novo.

| Token | Value | Usage nesta fase |
|-------|-------|------------------|
| xs | 4px | Gap ícone↔rótulo; `mt-1` do alinhamento do checkbox com a primeira linha do rótulo |
| sm | 8px | Espaçamento compacto: rótulo↔descrição do consentimento, gap switch↔label (`gap-2`, `space-y-2`) |
| md | 16px | Gap padrão entre blocos do diálogo de edição e entre linhas do bloco de retenção (`space-y-4`, `gap-4`) |
| lg | 24px | Ritmo vertical entre cartões de autorização e entre seções das duas telas novas (`space-y-6`); padding interno de `GlassCard` (`p-6`) |
| xl | 32px | Ritmo entre painéis maiores da página do admin (`space-y-8`) |
| 2xl | 48px | Quebra cabeçalho↔conteúdo; padding vertical dos estados vazio/erro (`p-12`, `py-12` do `AsyncState`) |
| 3xl | 64px | Respiro superior/inferior das páginas do candidato (`py-20`, herdado do `ScreenShell`) |

**Exceções (todas múltiplos de 4, todas justificadas):**

- `min-h-[44px]` (44 = 4×11) — piso de alvo tátil em **todo** controle acionável: o `switch` de
  marketing, o botão "Editar janela" de cada linha da matriz, os CTAs dos diálogos, o botão de
  retry do `AsyncState`, o card de navegação para `/candidato/privacidade`. Precedente:
  Phases 11/13/14/15/34/42.
- `p-5` (20px) — padding vivo de cada cartão de autorização em `AutorizacoesStep.tsx:111`.
  **Preservado verbatim.** Trocar por `p-6` seria mudança visual gratuita numa tela que esta fase
  só edita por conteúdo.
- **Alvo tátil do checkbox de consentimento:** o controle Radix mantém seu tamanho vivo; o alvo
  acessível é o `<Label htmlFor>` associado (já `cursor-pointer` no código vivo) e o cartão
  hospedeiro, que passa dos 44px por construção (`p-5` + rótulo + descrição de 2+ linhas). **Não**
  inflar o quadrado do checkbox — quebraria o alinhamento vivo com a primeira linha do rótulo.

---

## Typography

Família Helvetica Neue (`--font-family`). Exatamente **4 tamanhos, 2 pesos**. Body 1.5, heading 1.2.
Escala idêntica ao contrato aprovado das Phases 11/13/14/15/42 — não re-derivada.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / descrição de consentimento / prosa dos estados vazio e erro / linha de veredito | 16px (`text-base`) | regular (400) | 1.5 |
| Label / **eyebrow em caixa alta** / rótulo de checkbox e de switch / cabeçalho de coluna / legenda de versão / data / meta de linha / badge | 14px (`text-sm`) | semibold (600) | 1.4 |
| Título de card/painel/diálogo ("Suas autorizações", "Editar janela de retenção") | 20px (`text-xl`) | semibold (600) | 1.2 |
| H1 da página ("Seus dados e autorizações", "Retenção de dados") | 28px (`text-3xl`, cap responsivo `md:text-4xl`) | semibold (600) | 1.2 |

**Notas:**

- A proximidade 14/16 é intencional e separada perceptualmente por **peso** (14 = label semibold,
  16 = body regular) — precedente das Phases 11/13/14/15/42, não uma micro-banda 14/15/16.
- **A descrição de cada consentimento é leitura de carga**, não legenda: 16px / 1.5
  (`text-base leading-relaxed`), nunca truncada, nunca em `text-sm`. É o texto cujo hash é gravado;
  encolhê-lo é encolher a prova. ⚠ Isso **altera** o código vivo, que renderiza a descrição em
  `text-sm` (`AutorizacoesStep.tsx:146`) — é mudança deliberada desta fase, não deriva.
- Somente dois pesos: 400 e 600. Nada de 500/700/800, apesar de existirem em `globals.css`.

### `text-xs` (12px) — o 5º tamanho, e como esta fase não o cria

`globals.css:79` resolve `--text-xs` em **12px**, sem alias para 14px. Um eyebrow ou legenda em
`text-xs` seria um **5º tamanho**, e uma cerca sobre *onde* ele aparece não muda *quantos* existem
(veredito do checker da 42-UI-SPEC, rev 1). Portanto:

- **Esta fase autora zero `text-xs`.** Toda string que ela escreve ou reescreve — legenda de versão,
  nota de base legal, carimbo de data da prévia, meta de última alteração — renderiza a **14px**.
- Os `text-xs` vivos em `AutorizacoesStep.tsx:152` (badge "Obrigatório"), `:184` e `:215` são
  pré-existentes. `:184` e `:215` **entram na superfície de edição** desta fase (a copy do canal e a
  legenda de versão são reescritas) e por isso **migram para `text-sm`**. `:152` fica **byte-idêntico**
  — é o badge da linha obrigatória, que esta fase não toca — e permanece rastreado pelo achado
  cross-phase `.planning/todos/pending/ui-spec-text-xs-quinto-tamanho.md`.

---

## Color

Paleta **travada** — idêntica às Phases 11/13/14/15/34/42.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#00109E` brand-primary (`--primary`; `BackgroundImage background="gradient"` no candidato, `darkBlue` no admin) | Fundo de página atrás de todo glass/painel; **estado marcado do checkbox** (`data-[state=checked]:bg-[#00109E]`, comportamento vivo, preservado) |
| Secondary (30%) | `bg-white/5`–`bg-white/20` branco translúcido (`Glass`/`GlassCard`/`GlassPanel`) | Cartões de autorização, painel da lista, cabeçalho da tabela, diálogo, sidebar |
| Accent (10%) | `#35BFAD` brand-accent (`--accent`) | Ver lista reservada abaixo |
| Destructive | `#EF4444` (`--destructive`) | **Somente** erro: ícone/borda do estado de erro do `AsyncState`, mensagem de falha de escrita do consentimento, erro de validação do formulário. **Nada mais** |

**Accent (`#35BFAD`) reservado para — lista explícita:**

1. O estado **ativo** do item "Retenção" na `RHSidebar` (`bg-[#35BFAD]`) — comportamento já
   existente do componente, herdado, não novo.
2. O link/botão de ação **"Editar janela"** de cada linha da matriz (`text-accent`) — exatamente o
   mesmo tratamento do "Responder" da fila de revisões e do "Abrir" do `FilaTrabalhoTab`.

Accent **não** é usado para: nenhum elemento da superfície do candidato, nenhum estado do switch de
marketing, o CTA primário de nenhum diálogo, o card de navegação para `/candidato/privacidade`,
cabeçalhos, ou hover genérico. Os CTAs primários são glass-branco (`bg-white/20` → `bg-white/30`),
precedente das Phases 15 e 42.

### Tratamentos semânticos vivos (data/estado — fora do orçamento de accent)

Já existem no arquivo vivo e são **preservados**, não reinventados. São codificação de significado,
não decoração — mesma classificação que a 42-UI-SPEC deu às faixas de SLA.

| Tratamento | Classes | Onde |
|-----------|---------|------|
| Informativo / obrigatório | `bg-blue-500/10 border-blue-400/30` + ícone `Info` ou `Shield` `text-blue-400` | Banner LGPD do topo; cartão da autorização obrigatória; **linha informativa do transacional** (novo, mesmo idioma) |
| Cautela | `bg-amber-500/10 border-amber-400/30` + `Info` `text-amber-400` | Aviso final do passo (link da Política de Privacidade); banner do seed de 2 anos em `/admin/retencao` |
| Neutro / leitura | `rounded-lg border border-white/15 bg-white/5 p-4` | Bloco "O que guardamos e por quê"; bloco da prévia read-only |

**Regra de cor explícita, e ela é substantiva:** a prévia read-only ("N candidatos seriam
afetados") usa o tratamento **neutro**, jamais destructive e jamais âmbar. Nada é destruído; pintar
o número de vermelho afirmaria visualmente o oposto do que a fase faz.

**Regra colorblind-safe (herdada, `ScoreCell` / T-34-04-03):** nenhum estado desta fase é
comunicado só por cor. O transacional carrega o texto "Não é possível desativar" além do
tratamento azul; o switch de marketing carrega rótulo textual de estado além da posição.

---

## Copywriting Contract

Toda a copy em **pt-BR**. Regras de produto herdadas: "avaliação comportamental/cognitiva", **nunca**
"teste psicológico" (CLAUDE.md / RNF-07a); **nunca** "prazo legal" (42-UI-SPEC); nenhum score, banda
ou percentil em superfície de candidato.

**Regra desta fase, adicional e grep-ável:** proibidas em superfície de candidato as strings
`automaticamente`, `será excluído`, `serão apagados`, `exclusão automática` e `pessoa natural`.

#### ⚠ ESCOPO DO GREP — sem isto o critério REPROVA copy que esta própria spec exige

Achado do checker desta UI-SPEC, corrigido aqui em vez de virar defeito de plano. As duas bans
têm **escopos diferentes**, e tratá-las como uma só quebra o teste:

| Strings | Escopo do grep | Esperado |
|---|---|---|
| `pessoa natural` | **`src/` inteiro** — a string está banida em toda superfície, de candidato **e** de RH (a decisão BD-3 reescreve os 3 sítios, inclusive o `RegistrarDecisaoForm`) | `grep -rn "pessoa natural" src/` → **0** |
| `automaticamente` · `será excluído` · `serão apagados` · `exclusão automática` | **APENAS superfície de candidato** — allowlist explícita: `src/features/cadastro/`, `src/features/privacidade/`, `src/features/explicacao/` e templates de e-mail ao candidato em `supabase/functions/_shared/email-templates.ts` | **0** dentro da allowlist |

**Por que a allowlist é obrigatória e não estilo:** a página `/admin/retencao` que esta mesma spec
especifica usa `automaticamente` **duas vezes, verbatim e por exigência** — no banner de escopo e no
corpo do diálogo de confirmação. Ali a palavra é *honesta*: ela afirma que **nada** apaga
automaticamente, que é exatamente a verdade que a fase existe para tornar dizível. Um
`grep -rn "automaticamente" src/` repo-wide reprovaria a copy que a spec **manda escrever** — o
teste falharia contra o próprio contrato.

O critério de aceitação do plano tem de citar a allowlist, não a string solta. Um teste que reprova
o comportamento correto é pior que teste nenhum: ele treina quem executa a desligá-lo.

### Contrato mínimo do template

| Element | Copy |
|---------|------|
| Primary CTA | **Salvar janela de retenção** *(`/admin/retencao`)* · **Pedir que uma pessoa revise esta decisão** *(candidato, Art. 20 reescrito)*. `/candidato/privacidade` **não tem CTA primário por desenho** — a revogação é o próprio `switch`, sem botão "Salvar" (ver Invariante 4) |
| Empty state heading | **Você ainda não enviou um currículo.** *(bloco de guarda do currículo)* · **A matriz de retenção ainda não foi semeada.** *(admin)* |
| Empty state body | Quando você enviar um currículo, ele aparece aqui com o prazo de guarda que você autorizou. *(candidato)* · Nenhuma janela de retenção está definida. Enquanto isso, nenhum prazo é aplicado a nenhum estado. *(admin)* |
| Error state | **Não foi possível carregar suas autorizações.** Verifique sua conexão e tente novamente. *(+ Tentar novamente)* |
| Destructive confirmation | **Não há ação destrutiva nesta fase.** A ação mais forte da UI (salvar uma janela de retenção) é **aditiva e auditável** e não apaga nada. Ela é mesmo assim gatilhada por `alert-dialog`, porque muda um número de política — com a copy da tabela §Confirmação abaixo |

---

### Versão do texto de consentimento — o contrato de dado que a copy carrega

| Item | Contrato |
|------|----------|
| Constante | `CONSENT_TEXT_VERSION`, em `src/features/cadastro/constants.ts`, espelhada em `supabase/functions/_shared/constants.ts` (o mesmo par que já espelha `POLICY_VERSION`, com a mesma nota de "bump nos dois no mesmo commit") |
| **Nunca** reusar | `POLICY_VERSION` (`v1.0-2026-04`). São eixos independentes: a Política de Privacidade muda sem que o rótulo de um checkbox mude, e vice-versa. Reusar faria uma edição de política cunhar versões falsas de consentimento |
| Valor recomendado | `'v2-2026-08'` |
| Por que `v2` e não `v1` | Nenhuma linha jamais carregará `v1`: as linhas pré-enforcement carregam **NULL**, e é isso que as torna separáveis por dado (SC#1). `v1` fica **reservado** como identificador documental do texto que aquelas linhas NULL de fato viram — insumo direto da página pública de transparência da Phase 47 |
| Entrada do hash | `rótulo + descrição` de **cada** consentimento, normalizados (trim + NFC), na ordem em que aparecem na tela, mais a constante de versão. Cada string vive em um `const` nomeado, nunca inline no JSX |
| Superfície visível | A legenda de versão do passo, hoje em `AutorizacoesStep.tsx:196` e `:215`, passa a citar **as duas** versões — a da política e a do texto de consentimento (ver copy abaixo) |

---

### `AutorizacoesStep` — o passo de autorizações do cadastro

Ordem de renderização, de cima para baixo. **Quatro blocos onde hoje há cinco.**

#### Banner LGPD do topo — reescrito (Invariante 1)

| Element | Copy |
|---------|------|
| Título | **Lei Geral de Proteção de Dados (LGPD)** |
| Corpo | Seus dados pessoais são protegidos por lei. Depois de criar sua conta, você pode ver e mudar suas autorizações quando quiser, na página **Seus dados e autorizações**. |

**Proibido aqui:** "através do nosso portal" (não existe um portal com esses quatro verbos) e
qualquer enumeração de direitos que a página nova não atenda. A enumeração honesta vive no rodapé,
com o canal certo ao lado de cada item.

#### Bloco 1 — obrigatório (checkbox, **inalterado**)

| Element | Copy |
|---------|------|
| Rótulo | **Autorizo o uso dos meus dados** * *(tint azul + `Shield` + badge "Obrigatório")* |
| Descrição | Concordo que a Beauty Smile armazene e utilize meus dados pessoais para participação no processo seletivo. Sem esta autorização não é possível criar a conta. |

Marcado/desmarcado por interação, nunca por default; segue sendo o gate de submit (D-15). Copy
**verbatim do código vivo** — não reescrever: ela já é clara, e reescrevê-la mudaria o hash sem
ganho.

#### Bloco 2 — comunicações do processo (CONSENT-03, transacional) · **linha informativa, NÃO checkbox**

Renderizada **fora** do `<fieldset>` de escolhas, com tratamento informativo azul e ícone `Info`.
Sem `Checkbox`, sem `Switch`, sem `aria-checked`, sem qualquer controle. Um leitor de tela tem de
ouvir isto como informação, não como opção.

| Element | Copy |
|---------|------|
| Rótulo | **Avisos sobre o andamento da sua candidatura** |
| Estado, ao lado do rótulo | **Não é possível desativar** *(texto, 14px/600 — não é badge de alarme)* |
| Descrição | Enquanto você estiver participando de um processo seletivo, enviamos por e-mail os avisos sobre ele: confirmação da candidatura, mudança de etapa, convite de entrevista e o resultado. Esses e-mails fazem parte do próprio processo, então não dependem de autorização e não podem ser desligados. |
| Base legal | Base legal: execução de procedimentos preliminares ao contrato (LGPD, Art. 7º, V). |
| Fronteira | Estes avisos **nunca** incluem divulgação de outras vagas. Isso é a autorização separada logo abaixo. |

A última linha é a que impede a assimetria de virar dark pattern: ela diz explicitamente que o
canal sem opt-out **não** é usado para o que tem opt-out.

#### Bloco 3 — divulgação de vagas (CONSENT-03, marketing) · checkbox **desmarcado por padrão**

| Element | Copy |
|---------|------|
| Rótulo | **Quero receber avisos sobre novas vagas** |
| Descrição | Concordo em receber por e-mail avisos sobre novas oportunidades de vagas na Beauty Smile, mesmo quando eu não estiver participando de um processo seletivo. Você pode desligar isso quando quiser, na página **Seus dados e autorizações** — e nada muda nos avisos do seu processo. |

#### Bloco 4 — guarda do currículo (RETEN-03) · checkbox **desmarcado por padrão**

| Element | Copy |
|---------|------|
| Rótulo | **Autorizo guardar meu currículo por até 2 anos** |
| Descrição | Concordo que a Beauty Smile guarde meu currículo e os dados da minha candidatura por até 2 anos, para me considerar em futuras oportunidades, mesmo que eu não seja selecionado(a) no processo atual. Sem esta autorização, seus dados são guardados apenas enquanto o processo em que você está durar. |

O "por até 2 anos" **no rótulo**, não só na descrição: é o teto consentido, e é a frase que o
`/admin/retencao` cita como fonte do seed. Rótulo e banner do admin têm de dizer o mesmo número.

#### Bloco removido (BD-2 / CONSENT-05)

`autorizacao_analise_video` — **sai inteiro** do array `AUTORIZACOES`, do schema Zod
(`candidatoSchema.ts:362`) e dos `defaultValues` (`CadastroMultiStepForm.tsx:248`). Nenhuma copy
substituta, nenhuma nota explicativa no formulário: **o sistema não faz análise de vídeo, então não
há o que dizer ao candidato.** A coluna permanece no banco com `COMMENT` (BD-2) — isso é registro
técnico, não superfície.

#### Rodapé "Seus direitos" — reescrito (Invariante 1) · §Regra do canal honesto

Os **direitos permanecem listados**: eles existem por força do Art. 18 independentemente de o
sistema os automatizar, e apagá-los da tela seria esconder direito, não parar de prometer
mecanismo. O que muda é **o canal**, que hoje mente.

| Element | Copy |
|---------|------|
| Título | **Seus direitos:** |
| Item 1 | Acessar seus dados |
| Item 2 | Solicitar correção de dados incorretos |
| Item 3 | Solicitar a eliminação dos seus dados |
| Item 4 | Revogar as autorizações opcionais |
| Item 5 | Solicitar a portabilidade dos seus dados |
| Canal *(a frase que substitui "através do nosso portal")* | Hoje, revogar as autorizações opcionais você faz sozinho(a), na página **Seus dados e autorizações**. Para os demais direitos, escreva para o nosso Encarregado de Dados: [lgpd@beautysmile.com.br](mailto:lgpd@beautysmile.com.br) — respondemos por e-mail. |
| Legenda de versão | Política de Privacidade na versão **{POLICY_VERSION}** · texto destas autorizações na versão **{CONSENT_TEXT_VERSION}**. |

Notas de edição: o parêntese "(direito ao esquecimento)" do item 3 **sai** — não é o termo da LGPD
(Art. 18, VI fala em *eliminação*) e importa um conceito de outra jurisdição. Ambas as legendas
migram de `text-xs` para `text-sm` (§Typography).

#### Aviso final (âmbar) — **inalterado**, exceto a legenda de versão

Copy verbatim do vivo; o `<span className="text-white/70 text-xs">Versão {POLICY_VERSION}</span>`
vira `text-sm` e passa a nomear qual versão é (`Política de Privacidade, versão {POLICY_VERSION}`)
— hoje um "Versão X" solto ao lado de duas versões diferentes seria ambíguo.

---

### `/candidato/privacidade` — **Seus dados e autorizações** (CONSENT-04 + RETEN-03)

Mobile-first, `ScreenShell` clonada, own-row. Três seções.

| Element | Copy |
|---------|------|
| H1 | **Seus dados e autorizações** |
| Subtítulo | Aqui você vê o que autorizou, muda o que é opcional e sabe por quanto tempo guardamos seus dados. |
| Título da seção 1 | **Suas autorizações** |
| Título da seção 2 | **O que guardamos e por quê** |
| Voltar | **Voltar ao painel** *(`min-h-[44px]`, idioma do `ExplicacaoCandidatoPage`)* |

#### Seção 1 · linha do transacional (sem controle — Invariante 3)

| Element | Copy |
|---------|------|
| Rótulo | **Avisos sobre o andamento da sua candidatura** |
| Estado | **Sempre ativo · não é possível desativar** |
| Corpo | Fazem parte do processo seletivo em si — confirmação, mudança de etapa, convite de entrevista e resultado. Base legal: execução de procedimentos preliminares ao contrato (LGPD, Art. 7º, V). Não incluem divulgação de vagas. |

#### Seção 1 · linha do marketing (`switch` — a única escrita do candidato nesta fase)

| Element | Copy |
|---------|------|
| Rótulo do switch | **Avisos sobre novas vagas** |
| Corpo *(sempre visível ao lado do controle — é o texto do consentimento)* | Receber por e-mail avisos sobre novas oportunidades na Beauty Smile, mesmo fora de um processo seletivo. |
| Estado — ligado | **Ativo desde {dd/mm/aaaa}** |
| Estado — desligado | **Desativado em {dd/mm/aaaa}** |
| Estado — nunca autorizado | **Desativado** |
| Em voo | **Salvando…** *(switch desabilitado; `Loader2` girando ao lado)* |
| Sucesso ao revogar | toast.success **"Pronto. Você não receberá mais avisos sobre novas vagas."** |
| Sucesso ao ativar | toast.success **"Pronto. Você passará a receber avisos sobre novas vagas."** |
| Erro *(qualquer direção)* | Alerta inline destructive abaixo da linha: **"Não foi possível salvar esta mudança."** Sua autorização continua como estava. Tente novamente. — e o switch **volta ao estado do servidor** |

**Proibido nesta região** (Invariante 4): diálogo de confirmação ao revogar, pedido de motivo,
"tem certeza?", "você vai perder oportunidades", contra-oferta, ou qualquer atraso artificial. E,
por causa da Invariante 5, **proibida UI otimista**: o switch nunca mostra o estado desejado antes
da confirmação do servidor.

#### Seção 2 · guarda do currículo (RETEN-03) — leitura, sem controle

Este bloco é o **primeiro consumidor real** de `autorizacao_retencao_curriculo`. Renderiza uma de
três formas, e nenhuma delas promete exclusão automática (Invariante 1).

| Caso | Copy |
|------|------|
| Autorizado, com currículo | **Currículo guardado.** Você autorizou a Beauty Smile a guardar seu currículo e os dados da sua candidatura por **até 2 anos**. Base da guarda: sua autorização de {dd/mm/aaaa}. Prazo previsto: até **{dd/mm/aaaa}**. |
| **Não** autorizado, com currículo | **Currículo guardado enquanto o processo durar.** Você não autorizou a guarda por 2 anos, então seu currículo e os dados da sua candidatura ficam com a gente apenas enquanto o processo em que você está durar. |
| Sem currículo | **Você ainda não enviou um currículo.** Quando você enviar um, ele aparece aqui com o prazo de guarda que você autorizou. |
| Nota de revogação *(sempre visível nos dois primeiros casos)* | Para retirar esta autorização ou pedir a eliminação do seu currículo, escreva para o nosso Encarregado de Dados: [lgpd@beautysmile.com.br](mailto:lgpd@beautysmile.com.br). |

**Decisão registrada — por que a guarda do currículo NÃO ganha switch nesta fase.** A LGPD (Art. 8º,
§5) exige que o consentimento seja revogável, e essa exigência é atendida **por canal humano
nomeado e existente** — o Encarregado. O que não existe é motor de exclusão: ele é a Phase 45.
Um switch aqui desligaria uma flag e **nada mais aconteceria** — a promessa órfã, de novo, agora
sobre o dado mais sensível da fase. A escolha é deliberada: um caminho mais lento que funciona vale
mais que um instantâneo que mente. **Proibido**, na copy do candidato, prometer que a
autogestão chegará (isso é roadmap, não compromisso com o titular).

---

### `/admin/retencao` — **Retenção de dados** (RETEN-01/02/04)

Desktop-first, `RHLayout` + `GlassCard`, gêmeo estrutural do `BiasAuditPage`.

| Element | Copy |
|---------|------|
| Item do menu | **Retenção** *(ícone `CalendarClock` 24px; visível só para `administrador`)* |
| H1 | **Retenção de dados** |
| Subtítulo | Por quanto tempo os dados de uma candidatura ficam guardados, por estado. Alterável aqui, sem deploy. |
| **Banner do seed** *(âmbar, sempre visível, nunca colapsável, verbatim)* | **Todos os estados nascem com 2 anos porque 2 anos é o teto que o candidato já leu e aceitou no cadastro** — não é uma recomendação técnica. Encurtar o prazo de um estado é decisão que precisa de parecer jurídico trabalhista. |
| **Banner de escopo** *(neutro, sempre visível, verbatim)* | Esta matriz é **configuração**. Nada nesta página apaga dados, e hoje nenhuma rotina deste sistema apaga dados de candidato automaticamente. |
| Título da tabela | **Janela por estado da candidatura** |
| Coluna 1 | Estado |
| Coluna 2 | Janela de retenção |
| Coluna 3 | Origem |
| Coluna 4 | Última alteração |
| Coluna 5 | *(ações — cabeçalho `sr-only`: "Ações")* |
| Valores de "Origem" | **Seed (teto consentido)** · **Alterado por {nome}** |
| Valor de "Janela" | **{n} meses** *(24 meses no seed)* |
| "Última alteração" no seed | **—** *(travessão, nunca uma data falsa)* |
| Ação da linha | **Editar janela** *(único elemento accent da linha)* |
| Estado vazio | **A matriz de retenção ainda não foi semeada.** / Nenhuma janela de retenção está definida. Enquanto isso, nenhum prazo é aplicado a nenhum estado. |
| Estado de erro | **Não foi possível carregar a matriz de retenção.** / Verifique sua conexão e tente novamente. *(+ Tentar novamente)* |

**Nunca** um botão com verbo destrutivo nesta página (Invariante 1). **Nunca** "prazo legal".

#### Diálogo "Editar janela de retenção"

| Element | Copy |
|---------|------|
| Título | **Editar janela de retenção** |
| Descrição | Define por quanto tempo os dados de uma candidatura neste estado ficam guardados. A alteração fica registrada na trilha de auditoria. |
| Bloco de contexto (somente leitura) | Estado · Janela atual · Última alteração |
| Label do campo | Janela de retenção *(em meses)* |
| Ajuda do campo | Máximo de **24 meses** — o teto que o candidato já leu e aceitou no cadastro. |
| Erro — acima do teto | **A janela não pode passar de 24 meses.** Esse é o teto consentido pela copy do cadastro. |
| Erro — vazio ou não-positivo | **Informe um número de meses maior que zero.** |
| CTA primário | **Salvar janela de retenção** *(desabilitado até haver valor válido diferente do atual)* |
| CTA secundário | **Fechar sem salvar** *(deliberadamente **não** "Cancelar": rótulo genérico é proibido, e este botão precisa ser distinguível do **Voltar** do `alert-dialog` aninhado)* |
| Estado de envio | **Salvando…** *(`Loader2` girando; CTA desabilitado — sem duplo submit)* |
| Sucesso | toast.success **"Janela de retenção atualizada."** |
| Erro genérico | toast.error **"Não foi possível salvar a janela. Tente novamente."** *(o diálogo permanece aberto e o valor digitado é preservado)* |

O cap de 24 é **cosmético na UI** — quem impede de verdade é o servidor (mesmo modelo mental do
D-13 e do guard REVISAO-05). O plano tem de cabear a checagem nos dois lados.

#### Confirmação (`alert-dialog` aninhado)

| Element | Copy |
|---------|------|
| Título | **Salvar janela de retenção?** |
| Corpo | O estado **{estado}** passa de **{n} meses** para **{m} meses**. Nenhum dado de candidato é apagado por esta alteração — e hoje nenhuma rotina deste sistema apaga dados de candidato automaticamente. |
| Confirmar | **Salvar janela de retenção** |
| Recuar | **Voltar** |

**Distinção obrigatória dos dois recuos** (podem aparecer no mesmo fluxo): **Voltar** fecha só a
confirmação e devolve ao formulário preenchido; **Fechar sem salvar** abandona a edição inteira.
Nenhum dos dois pode ser rotulado "Cancelar".

#### Prévia read-only (RETEN-04) — bloco neutro, abaixo da tabela

| Element | Copy |
|---------|------|
| Título | **Prévia — quantos seriam afetados** |
| Corpo | Contagem de candidatos cujos dados já teriam passado da janela definida acima. **Esta prévia não executa nada.** |
| Linha por estado | {Estado} · **{n} candidatos** |
| Total | Total: **{n} candidatos** |
| Zero | **Nenhum candidato seria afetado por esta janela hoje.** |
| **Carimbo de data** *(obrigatório, 14px)* | Prévia calculada em {dd/mm/aaaa} às {HH:mm}. |
| Erro | **Não foi possível calcular a prévia.** A matriz acima continua legível e editável. *(+ Tentar novamente)* |

**Três regras substantivas:**

1. **A prévia nunca identifica candidato.** Só contagens agregadas por estado — nunca nome, e-mail,
   ID ou lista de linhas. Uma tela que enumera pessoas prestes a serem apagadas é superfície de
   exfiltração de PII construída sem necessidade.
2. **A prévia carimba a própria data.** Precedente direto do 42-12: fato datado cuja data depende
   de alguém lembrar de anotá-la é promessa sem código que a execute. Sem carimbo não há como
   distinguir um número de hoje de um número colado do mês passado.
3. **A prévia não fica ao lado de nenhum botão de ação.** Nenhum "Executar", nenhum "Aplicar
   agora", nenhum controle a menos de um card de distância. A tela não deve sugerir que existe um
   gatilho — porque não existe.

---

### Copy do Art. 20 reescrita (BD-3) — os 3 sítios vivos

**Regra que delimita o alvo (Invariante 8):** morre **"por pessoa natural"**. `solicitar` /
`solicitação` é português comum e **fica** onde já lê bem — inclusive nos e-mails, que **não** estão
no escopo desta fase (`email-templates.ts:205/225/270` permanecem byte-idênticos; mexer neles
significaria reabrir o arquivo que embarcou 2 CRITICAL em PROD, para trocar uma palavra que não é
juridiquês).

| Arquivo:linha | Antes | Depois |
|---------------|-------|--------|
| `SolicitarRevisaoCTA.tsx:47` (`cta`) | Solicitar revisão por pessoa natural | **Pedir que uma pessoa revise esta decisão** |
| `SolicitarRevisaoCTA.tsx:51` (`dialogTitle`) | Solicitar revisão? | **Pedir revisão desta decisão?** |
| `SolicitarRevisaoCTA.tsx:54` (`dialogConfirm`) | Solicitar revisão | **Pedir revisão** |
| `ExplicacaoCandidatoPage.tsx:46` (`revisionIntro`) | Você tem o direito de solicitar a revisão desta decisão por uma pessoa natural (LGPD, Art. 20). | **Você pode pedir que uma pessoa da nossa equipe revise esta decisão. É um direito seu (LGPD, Art. 20).** |
| `RegistrarDecisaoForm.tsx:189` (RH) | Esta decisão finaliza o funil e o candidato poderá solicitar revisão por pessoa natural (LGPD Art. 20). Fica registrada na trilha de auditoria. | **Esta decisão finaliza o funil e o candidato poderá pedir que uma pessoa revise esta decisão (LGPD, Art. 20). Fica registrada na trilha de auditoria.** |

**Explicitamente INALTERADOS** (não contêm juridiquês; tocá-los seria churn de teste sem ganho):

- `SolicitarRevisaoCTA.tsx:48` — `Você já solicitou a revisão desta decisão.`
- `SolicitarRevisaoCTA.tsx:50` — `Sua solicitação de revisão foi respondida.`
- `SolicitarRevisaoCTA.tsx:53` — corpo do diálogo
- `SolicitarRevisaoCTA.tsx:99/148` — tooltips `Solicitação registrada em …`
- Todo o corpus de e-mail do 5º evento (42-08)

**Testes que pinam as strings alteradas** (a mudança aparece no diff em vez de escorregar):
`SolicitarRevisaoCTA.test.tsx:35` (`cta`) e `ExplicacaoCandidatoPage.test.tsx:138` (`revisionIntro`).
Os demais sítios alterados (`dialogTitle`, `dialogConfirm`, RH) **não** estão pinados hoje — o plano
deve pinar os três, senão a próxima reescrita escorrega de novo.

**Varredura obrigatória de fecho:** `grep -rn "pessoa natural" src/` tem de voltar **zero** em copy
renderizada. Há ocorrências em **docblocks e comentários** (`SolicitarRevisaoCTA.tsx:2`,
`routes.tsx:281`) que também devem ser atualizadas para não deixar o comentário mentindo sobre o
componente.

---

### Regra do rodapé de e-mail (CONSENT-03 / CONSENT-06 — fronteira, não tela)

CONSENT-06 (click tracking) não tem UI. Mas a separação transacional × marketing **tem** consequência
de copy em e-mail, e ela é onde a assimetria pode virar mentira:

1. **O rodapé transacional vivo permanece verbatim** (`email-templates.ts` `layoutBase`): "Este é um
   e-mail automático e transacional referente ao seu processo seletivo… Você o recebeu porque se
   candidatou a uma vaga." **Nenhuma linha de descadastro** pode ser adicionada a ele — o
   transacional não tem opt-out (Art. 7º, V, travado no M7 e preservado).
2. **Se e somente se um caminho de envio de marketing embarcar nesta fase**, seu rodapé tem de
   carregar o caminho de revogação nomeado: **"Você recebeu este e-mail porque autorizou avisos
   sobre novas vagas. Para parar de recebê-los, acesse Seus dados e autorizações no seu painel."**
3. **Ordem obrigatória:** nenhum rodapé pode oferecer descadastro **antes** de
   `/candidato/privacidade` estar viva. Um link que promete revogação e leva a 404 é a promessa
   órfã na sua forma mais literal.

---

## Component Inventory (for the planner)

### Feature nova `src/features/privacidade/` (candidato)

| Componente / módulo | Papel |
|---------------------|-------|
| `PrivacidadeCandidatoPage` (`components/`) | Página de topo no `ScreenShell` clonado. H1 + subtítulo + `AutorizacoesLista` + `GuardaCurriculoBloco` + "Voltar ao painel". Rota `/candidato/privacidade` com `RoleGuard role="candidato"` |
| `AutorizacoesLista` (`components/`) | Lista fixa de 3 linhas: transacional (sem controle) · marketing (`switch`) · guarda do currículo (leitura). Nunca renderiza lista variável |
| `ConsentimentoSwitchRow` (`components/`) | Uma linha com `Switch` + `Label` + texto do consentimento sempre visível + estado textual + região de erro inline. `min-h-[44px]`. **Sem UI otimista** (Invariante 5) |
| `GuardaCurriculoBloco` (`components/`) | Três casos (autorizado / não autorizado / sem currículo) + nota de revogação por canal |
| `usePrivacidade` (`hooks/`) | TanStack Query own-row; chave `privacidadeKeys.autorizacoes(candidatoId)` |
| `useRevogarMarketing` (`hooks/`) | `useMutation` nas duas direções; invalida a query; **nunca** `onMutate` otimista |
| `privacidadeService.ts` (`services/`) | Leitura por allowlist explícita + escrita own-row. Classe `PrivacidadeError` com `code`, seguindo o padrão de erro do projeto |

### Feature nova `src/features/admin/retencao/`

| Componente / módulo | Papel |
|---------------------|-------|
| `RetencaoPage` (`components/`) | `RHLayout` + `GlassCard`. Banner do seed + banner de escopo + `MatrizRetencaoTable` + `PreviaRetencaoBloco`. Rota `/admin/retencao`, `RoleGuard role="administrador"` |
| `MatrizRetencaoTable` (`components/`) | Envolvida por `AsyncState` (copy sobrescrita). Molde estrutural do `FilaRevisoesTable`. 5 colunas. **Sem paginação, sem scroll interno** — ver §UI Considerations E6 |
| `EditarJanelaDialog` (`components/`) | `Dialog` + `input` numérico + validação de teto + `alert-dialog` de confirmação aninhado |
| `PreviaRetencaoBloco` (`components/`) | Contagens agregadas por estado + total + carimbo de data + estado zero. **Zero identificação de candidato, zero botão de ação** |
| `useMatrizRetencao` / `useSalvarJanela` / `usePreviaRetencao` (`hooks/`) | TanStack Query + mutation; chaves hierárquicas `retencaoKeys.*`; a prévia é invalidada pela mutation da janela |
| `retencaoService.ts` (`services/`) | Leituras por allowlist + escrita da janela |
| `janelaRetencaoSchema.ts` (`schemas/`) | Zod: inteiro `.min(1)` `.max(24)` com as mensagens pt-BR da tabela de copy |

### Edições em arquivos existentes

| Arquivo | Edição |
|---------|--------|
| `src/features/cadastro/components/steps/AutorizacoesStep.tsx` | Banner reescrito · bloco transacional informativo novo (fora do `fieldset`) · rótulos/descrições dos blocos 3 e 4 reescritos · bloco de vídeo removido · rodapé de direitos + canal reescrito · duas legendas de versão · descrição a 16px · `text-xs` → `text-sm` em `:184` e `:215` |
| `src/features/cadastro/schemas/candidatoSchema.ts` | `:360` marketing sem `.default(true)` · `:361` retenção sem `.default(true)` · `:362` removido · campo novo do transacional conforme o modelo de dado que o plano escolher |
| `src/features/cadastro/components/CadastroMultiStepForm.tsx` | `defaultValues` `:245-248` alinhados ao schema — **os dois sítios no mesmo commit**, senão o formulário fica inconsistente com o schema |
| `src/features/cadastro/constants.ts` | +`CONSENT_TEXT_VERSION`, espelhada em `supabase/functions/_shared/constants.ts` |
| `src/features/explicacao/components/SolicitarRevisaoCTA.tsx` | 3 strings do `COPY` (`cta`, `dialogTitle`, `dialogConfirm`) + docblock |
| `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx` | 1 string (`revisionIntro`) |
| `src/features/decisao/components/RegistrarDecisaoForm.tsx` | 1 string (`:189`) |
| `src/components/RHSidebar.tsx` | +1 `MenuItem` `retencao-admin` role-gated · +1 linha em `getActivePageFromPath` **antes** do `/admin` genérico · +1 entrada no mapa `routes` |
| `src/router/routes.tsx` | +2 rotas (`/candidato/privacidade`, `/admin/retencao`) com os guards da tabela §Rotas novas; `/admin/retencao` via `lazyNamed` (idioma PERF-03) |
| `src/components/pages/MeuPerfilCandidatoPage.tsx` | +1 card de navegação para `/candidato/privacidade` (`min-h-[44px]`). **Não** mover nada de perfil para lá (D-10 da Phase 17) |

### Formatação

- Datas: `dd/mm/aaaa` via `toLocaleDateString('pt-BR', …)` — idioma vivo em `SolicitarRevisaoCTA`.
- Hora do carimbo da prévia: `HH:mm` 24h, pt-BR.
- Contagens: inteiro puro, sem separador até 999; `toLocaleString('pt-BR')` acima disso.
- Meses: **sempre** "{n} meses" por extenso, nunca "24m" — é um número de política, não uma métrica.

---

## UI Considerations

Derivado do `ui-consideration-probe` com **`elements` autorados**. A nota metodológica da
42-UI-SPEC vale aqui integralmente e **não é opcional**: o classificador do probe usa cues em
inglês (`tables?`, `forms?`, `lists?`) e a prosa deste projeto é pt-BR, então `tabela`, `formulário`
e `botão` não casam com cue nenhum — classificar pela prosa produziria falso verde.

Cobertura: **43 aplicáveis · 43 resolvidas · 0 não resolvidas** — 41 explícitas, 2 backstop.

Elementos sondados: **E1** `AutorizacoesStep` (form · static-content) · **E2** linha informativa do
transacional (static-content) · **E3** `AutorizacoesLista` (list-collection) · **E4**
`ConsentimentoSwitchRow` de marketing (form · interactive-control) · **E5** `GuardaCurriculoBloco`
(static-content) · **E6** `MatrizRetencaoTable` (list-collection · interactive-control) · **E7**
`EditarJanelaDialog` (form) · **E8** `PreviaRetencaoBloco` (static-content) · **E9** CTA do Art. 20
reescrito (interactive-control) · **E10** item "Retenção" da `RHSidebar` (nav).

| # | Elemento | Category | Status | Resolution / Reason |
|---|----------|----------|--------|---------------------|
| E1 | `AutorizacoesStep` | empty | ✅ covered | Estado inicial do passo **é** o vazio significativo desta fase: obrigatório desmarcado, marketing desmarcado, guarda de currículo desmarcada (CONSENT-01). Nenhum default `true` sobrevive nos dois sítios (schema + `defaultValues`) |
| E1 | `AutorizacoesStep` | loading | ✅ covered | O passo não busca dado remoto; o único valor externo é `CONSENT_TEXT_VERSION`, uma constante compilada. Sem estado de carregamento possível |
| E1 | `AutorizacoesStep` | error | ✅ covered | Erro de validação do obrigatório renderiza `role="alert"` sob o cartão (comportamento vivo, preservado). Erro de submit é do formulário multi-step, fora desta edição |
| E1 | `AutorizacoesStep` | partial | ✅ covered | Obrigatório marcado + opcionais desmarcados é o caminho esperado e submete normalmente; obrigatório desmarcado bloqueia o submit (gate D-15, inalterado) |
| E1 | `AutorizacoesStep` | overflow | ✅ covered | Quatro blocos empilhados, altura livre, sem contêiner de altura fixa e sem scroll interno |
| E1 | `AutorizacoesStep` | long-text | 🧪 backstop | As descrições são as strings mais longas da fase (até ~55 palavras) e o passo é **mobile-first**: a 320px elas quebram em 6+ linhas ao lado de um checkbox alinhado ao topo. **Backstop:** teste de estado visual em 320px provando que nenhuma descrição é truncada, nenhum cartão transborda e o rótulo não colide com o checkbox. Truncar aqui truncaria a entrada do hash |
| E2 | Linha do transacional | overflow | ✅ covered | Bloco de texto de altura livre, mesmo tratamento dos cartões vizinhos; sem contêiner fixo |
| E2 | Linha do transacional | long-text | ✅ covered | Quatro linhas fixas de copy (rótulo, estado, descrição, base legal, fronteira), sem interpolação de texto livre. Nada a truncar |
| E3 | `AutorizacoesLista` | empty | ✅ covered | **Dismissed com razão:** a lista é fixa em 3 linhas conhecidas em tempo de compilação; não há caminho de dado que a esvazie. Ausência de valor no servidor cai nos estados por linha (E4/E5), não num vazio de lista |
| E3 | `AutorizacoesLista` | loading | ✅ covered | Skeleton de 3 blocos glass pulsantes (idioma verbatim do `ExplicacaoCandidatoPage.tsx:88-95`), preservando a altura para não haver salto de layout |
| E3 | `AutorizacoesLista` | error | ✅ covered | Copy própria em §Copywriting ("Não foi possível carregar suas autorizações.") + retry. Nunca ecoa erro cru de transporte |
| E3 | `AutorizacoesLista` | populated | ✅ covered | Três linhas na ordem travada: transacional (sem controle) → marketing (`switch`) → guarda do currículo (leitura). A ordem é contratual: o item sem escolha vem primeiro para que a assimetria seja lida antes da escolha |
| E3 | `AutorizacoesLista` | partial | ✅ covered | Um candidato sem currículo tem a 3ª linha no caso "sem currículo" enquanto as duas primeiras renderizam normal — parcial é estado válido, nunca tela de erro |
| E3 | `AutorizacoesLista` | overflow | ✅ covered | Três linhas de altura livre em coluna `max-w-2xl`; sem scroll interno, sem altura fixa |
| E3 | `AutorizacoesLista` | zero-one-many | ✅ covered | **Dismissed com razão:** cardinalidade constante 3. Sem copy singular/plural a errar |
| E3 | `AutorizacoesLista` | long-text | ✅ covered | Textos fixos; a única interpolação é data `dd/mm/aaaa` (largura conhecida) |
| E4 | `ConsentimentoSwitchRow` | empty | ✅ covered | Nunca autorizado → switch desligado + rótulo de estado **Desativado** (sem data). Nunca renderiza switch em estado indeterminado |
| E4 | `ConsentimentoSwitchRow` | loading | ✅ covered | Em voo: switch **desabilitado** + "Salvando…" + `Loader2`. Nunca mostra o estado desejado antes da confirmação do servidor (Invariante 5) |
| E4 | `ConsentimentoSwitchRow` | error | ✅ covered | Alerta inline destructive **abaixo da linha** (não toast — toast some e este é o caso em que a pessoa precisa saber que sua autorização NÃO mudou) + reversão visível ao estado do servidor |
| E4 | `ConsentimentoSwitchRow` | partial | ✅ covered | Não há estado parcial: o valor é booleano confirmado pelo servidor. Um terceiro estado só existe em voo, e ele é o `loading` acima |
| E4 | `ConsentimentoSwitchRow` | long-text | ✅ covered | Texto do consentimento sempre visível ao lado do controle, quebrando livremente; nunca colapsado atrás de "ler mais" — é o texto que torna a concessão informada |
| E5 | `GuardaCurriculoBloco` | overflow | ✅ covered | Três variantes de copy curta e fixa + 2 datas; altura livre, sem scroll |
| E5 | `GuardaCurriculoBloco` | long-text | ✅ covered | Sem texto livre do usuário; interpolações limitadas a datas `dd/mm/aaaa` |
| E6 | `MatrizRetencaoTable` | empty | ✅ covered | Seed ausente → copy própria ("A matriz de retenção ainda não foi semeada."), nunca o vazio genérico do `AsyncState`, e o corpo diz a consequência real (nenhum prazo aplicado) |
| E6 | `MatrizRetencaoTable` | loading | ✅ covered | Skeleton do `AsyncState` na tabela |
| E6 | `MatrizRetencaoTable` | error | ✅ covered | Copy própria + retry; nunca ecoa erro cru |
| E6 | `MatrizRetencaoTable` | populated | ✅ covered | Uma linha por estado, 5 colunas, seed uniforme de 24 meses com "Origem = Seed (teto consentido)" e "Última alteração = —" |
| E6 | `MatrizRetencaoTable` | partial | ✅ covered | Dois parciais nomeados: estado presente no enum e ausente da matriz → linha renderizada com janela **"— (não definida)"** e Origem vazia, nunca omitida em silêncio; linha alterada por usuário removido de `usuarios_rh` → **Não identificado** (nunca UUID, invariante herdada da 42-UI-SPEC) |
| E6 | `MatrizRetencaoTable` | overflow | ✅ covered | **Sem risco por construção:** a chave é um enum fechado — `status_candidatura` tem **5** valores e `etapa_processo` tem **8** (medidos em `database.types.ts:5319` e `:5290`). A tabela não cresce em runtime sob nenhuma das duas chaves, logo **sem paginação, sem `max-h`, sem scroll interno**. Só `overflow-x-auto` no wrapper para largura estreita, igual ao `FilaRevisoesTable` |
| E6 | `MatrizRetencaoTable` | zero-one-many | ✅ covered | Zero → vazio próprio (seed ausente); um → linha única sem tratamento especial; "muitos" tem teto de 8 |
| E6 | `MatrizRetencaoTable` | long-text | ✅ covered | Rótulos de estado vêm de enum (strings curtas e fixas, mapeadas para pt-BR legível); o nome do último alterador usa `truncate` + `title` |
| E7 | `EditarJanelaDialog` | empty | ✅ covered | Abre com o valor atual pré-preenchido e selecionado; campo limpo bloqueia o submit com a mensagem "Informe um número de meses maior que zero." |
| E7 | `EditarJanelaDialog` | loading | ✅ covered | CTA em estado pendente ("Salvando…") durante a mutation; o diálogo não fecha até o servidor responder |
| E7 | `EditarJanelaDialog` | error | ✅ covered | Dois erros distintos: validação local (teto de 24 / não-positivo, inline sob o campo) e falha de escrita (toast + diálogo aberto com o valor preservado) |
| E7 | `EditarJanelaDialog` | partial | ✅ covered | Valor válido porém idêntico ao atual mantém o CTA desabilitado — salvar sem mudança escreveria uma linha de auditoria vazia |
| E7 | `EditarJanelaDialog` | long-text | ✅ covered | Entrada numérica com `inputMode="numeric"` e `maxLength` de 2 dígitos; sem texto livre no formulário |
| E8 | `PreviaRetencaoBloco` | overflow | ✅ covered | No máximo 8 linhas de contagem + total; altura livre, sem scroll |
| E8 | `PreviaRetencaoBloco` | long-text | 🧪 backstop | O risco real deste bloco não é comprimento — é a **prévia parecer acionável**. **Backstop:** teste de estado visual + asserção negativa provando que nenhum descendente do bloco é `<button>`/`<a>` e que sua copy não contém nenhum verbo destrutivo (`purgar`, `executar`, `apagar`, `limpar`, `excluir`). Nenhuma asserção que olhe só texto visível pegaria um botão adicionado ali depois |
| E9 | CTA do Art. 20 reescrito | long-text | ✅ covered | "Pedir que uma pessoa revise esta decisão" é ~13 caracteres mais longo que o rótulo vivo; o botão é glass com quebra livre e `min-h-[44px]`, então cresce em altura em 320px em vez de estourar. Rótulo fixo, sem interpolação |
| E10 | Item "Retenção" da sidebar | loading | ✅ covered | Item estático, sem contador e sem dado remoto — renderiza junto com o menu. Nada a carregar (diferente do item "Revisões", que tem badge) |
| E10 | Item "Retenção" da sidebar | error | ✅ covered | Sem fonte de dado, logo sem caminho de falha. A visibilidade depende só de `role`, já subscrito no store |
| E10 | Item "Retenção" da sidebar | overflow | ✅ covered | Rótulo de uma palavra; no menu recolhido vira só ícone com `title`, comportamento vivo do componente |
| E10 | Item "Retenção" da sidebar | long-text | ✅ covered | "Retenção" — 8 caracteres, mais curto que "Configurações", que já cabe |

<!-- Status vocabulary (locked by probe-core projectTruths):
     ✅ covered   → a plain truth string lifted into must_haves.truths
     🧪 backstop  → a flat scalar { statement, verification: backstop }; at verify time, no explicit
                    evidence → insufficient_spec → human_needed (never a silent pass, #1154)
     ⚠ unresolved → an explicit planner assumption (surfaced, never silently dropped)
     Rows are REPLACED (not appended) on a probe re-run — idempotent. -->

### Acessibilidade (piso, não varredura completa)

- Todo controle acionável com `min-h-[44px]`; ícones decorativos com `aria-hidden="true"`.
- **A linha do transacional não é um controle** e não pode carregar `role="checkbox"`,
  `aria-checked`, `aria-disabled` nem `<input disabled>`. Ela fica **fora** do `<fieldset>` de
  escolhas — um leitor de tela tem de ouvir "informação", não "opção desabilitada".
- O `<fieldset>` + `<legend className="sr-only">` do passo é preservado (contrato a11y vivo) e sua
  legenda passa a nomear só as escolhas: **"Autorizações opcionais"**.
- `Switch` com `Label` associado por `htmlFor` e estado textual adjacente — nunca só a posição do
  controle (regra colorblind-safe).
- Erro de escrita do consentimento em **texto visível** e `role="alert"`, não só toast.
- `Dialog` com `DialogTitle` + `DialogDescription` reais (não `sr-only` vazios); foco no primeiro
  controle, retorno ao gatilho ao fechar (Radix cuida, não sobrescrever).
- Tabela com `TableHeader`/`TableHead` semânticos; cabeçalho da coluna de ações com `sr-only`.
- ⚠ `GlassButton` **descarta props não-estilo** (D-42-11-01, corrigido no 42-11) — conferir o estado
  vivo antes de contar com `aria-label` passado por prop.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | checkbox, label, alert, switch, table, dialog, alert-dialog, input, button, tooltip, skeleton, separator, badge | not required — todos já vendorizados em `src/components/ui/` desde o M1/Phase 7; nenhum `add`/`init` executado nesta fase |
| third-party | **nenhuma declarada** | not applicable |

Nenhuma registry de terceiros declarada → **nenhum** gate `shadcn view`/diff necessário.
**Zero dependência npm nova** (invariante do M8 herdada do M7): `lucide-react`,
`@tanstack/react-query`, `react-hook-form`, `zod` e `sonner` já são dependências do projeto. Toda a
UI sai de primitivos vendorizados + a camada glass do projeto + os componentes reusados listados em
§Design System.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
