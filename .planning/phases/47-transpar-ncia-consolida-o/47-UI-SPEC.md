---
phase: 47
slug: transpar-ncia-consolida-o
status: draft
shadcn_initialized: true
preset: existing project install (shadcn/ui + Radix; tokens em src/styles/globals.css; primitivos vendorizados em src/components/ui/ desde o M1)
created: 2026-08-08
persona: visitante público (mobile-first — duas rotas net-new sem auth) + RH (uma linha do Histórico em tela existente, desktop-first)
mode: autônomo (gerado dentro de /gsd-autonomous — nenhuma pergunta ao operador; ver §Decisões tomadas em nome do operador)
---

# Phase 47 — UI Design Contract

> Contrato visual e de interação da **Transparência & Consolidação**.
> Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

## Por que esta UI-SPEC existe, em uma frase que o ROADMAP já escreveu

> *"O que o sistema faz com o dado está escrito onde o candidato lê — e nenhuma promessa de
> compliance sobrevive neste repositório sem código que a execute."*

As Phases 42–45 construíram o motor. Esta fase escreve, numa página que qualquer pessoa abre sem
login, **o que o motor faz**. A assimetria de risco é o inverso da Phase 45: lá, uma ambiguidade de
copy virava ação irreversível; **aqui, uma imprecisão de copy vira uma declaração pública falsa
sobre tratamento de dados pessoais** — o gênero exato de artefato que a ANPD lê como evidência, e
que este milestone existe para deixar de produzir.

**Consequência mecânica:** toda linha destas duas páginas é ou (i) **derivada** de um artefato
gerado que falha alto quando diverge da fonte, ou (ii) **datada** — uma afirmação sobre o estado do
sistema numa data nomeada. Não existe terceira categoria. Uma frase que não seja derivada nem
datada é uma promessa, e promessa é o que esta fase remove.

---

## Escopo desta UI-SPEC

Dos 6 requirements da fase, **3 têm superfície visual**. A ausência dos outros está declarada para
não ser lida como esquecimento.

| Requirement | Superfície | Natureza |
|-------------|-----------|----------|
| **TRANSP-01** | **`/subprocessadores`** — rota pública net-new, sem auth, indexável | **Rota nova** (mobile-first) |
| **TRANSP-02** | **`/privacidade`** — rota pública net-new, sem auth, indexável. Tabela de retenção **derivada** por gerador em build-time | **Rota nova** (mobile-first) |
| **CONSOL-02** | O **nome do recrutador** no `HistoricoBlock`, em vez do UUID do `ator` | **Emenda de uma linha em tela existente** (RH, desktop-first) |
| — | **Alcançabilidade** das duas rotas novas — `RodapePublico` | **Componente novo** (ver Decisão D-47-U02) |
| CONSOL-01 (Nyquist), CONSOL-03 (`DROP` do zumbi), CONSOL-04 (checklist versionado) | — | **Sem UI.** São seis `VALIDATION.md`, uma migration destrutiva e um teste. Nenhuma tela os exibe |

**Binding upstream:** `47-CONTEXT.md` (16 decisões em 4 áreas), `.planning/REQUIREMENTS.md`
(TRANSP-01/02, CONSOL-01..04), `.planning/ROADMAP.md` §Phase 47 (4 critérios de sucesso),
`CLAUDE.md` (pt-BR de domínio; "avaliação comportamental/cognitiva", nunca "teste psicológico"), e
as UI-SPECs aprovadas **43** (a shell do candidato, a matriz de retenção como dado, a âncora
visual), **44** (método) e **45** (o vocabulário travado de "o que fica", o recibo derivado, as
regras de e-mail e a Invariante 9 sobre o que a superfície do RH **não** pode revelar).

**Reuse-first:** esta fase **não** introduz token novo, escala nova, primitivo novo nem dependência
npm nova. Ela introduz **duas rotas** e **um componente de rodapé** — e nada mais.

### O que esta fase deliberadamente NÃO faz

- **Nenhuma leitura de dados em runtime nas duas páginas públicas.** Zero `useQuery`, zero RPC,
  zero `supabase.from(...)`. Todo conteúdo vem de import estático de constantes geradas/autoradas.
  É a consequência direta da decisão travada no CONTEXT (*"Rejeitado: ler `listar_matriz_retencao`
  em runtime — exigiria expor a RPC a `anon`"*), e ela **elimina por construção** os estados de
  carregamento, erro de rede e parcialidade nas duas telas.
- **Nenhum controle acionável nas duas páginas públicas além de links.** Sem formulário, sem
  botão de ação, sem accordion, sem toggle, sem busca, sem filtro, sem download.
- **Nenhuma tela nova de RH**, nenhuma coluna nova, nenhuma fila nova.
- **Nenhuma alteração em `/candidato/privacidade`.** As quatro seções que as Phases 43/44/45
  construíram ficam **byte-idênticas**. A página pública **aponta** para ela; não a absorve nem a
  duplica (ver Invariante 3).
- **Nenhuma dependência de SEO** (`react-helmet` e afins). Ver §"Indexável", abaixo.

---

## Correções factuais ao 47-CONTEXT (medidas no código e nos artefatos vivos em 2026-08-08)

Quatro. Duas alteram o desenho, uma inverte uma causa declarada e uma corrige numeração. Todas
registradas porque um plano que herde o texto do CONTEXT sem elas construirá a coisa errada.

### 1 · Os IDs de requirement do CONTEXT estão deslocados em relação ao `REQUIREMENTS.md`

| Item | `REQUIREMENTS.md` (canônico) | `47-CONTEXT.md` diz |
|---|---|---|
| Cobertura Nyquist das 6 fases do M7 | **CONSOL-01** | CONSOL-... (implícito em "Área 4") |
| **Histórico mostra o nome do recrutador** | **CONSOL-02** | CONSOL-01 |
| Zumbi `data_deletion_log` | **CONSOL-03** | CONSOL-03 ✓ |
| Checklist versionado de promessas | **CONSOL-04** | CONSOL-02 |

O canônico é o `REQUIREMENTS.md`, e ele é **corroborado pelo código vivo**: o `COMMENT` da migration
`20260805000006_p45_anonimizar_candidato.sql:938` chama o problema do `ator` de
*"dependência declarada da W-1/**CONSOL-02** da Phase 47"*. **Este documento usa a numeração do
`REQUIREMENTS.md`.** Um plano que use a do CONTEXT vai marcar o requirement errado como entregue.

### 2 · O Histórico **NÃO** é uma superfície de candidato — é do RH, e o candidato não tem acesso a ela

O CONTEXT afirma que o nome é resolvido no servidor para *"evitar expor a tabela de usuários RH ao
candidato — **o candidato recebe** o nome já resolvido"*.

No código vivo, o candidato **não recebe nada**: `historicoCandidaturaService.ts:4` declara a RLS
`rh_le_historico` e o docblock diz textualmente *"RH/admin only (**candidate DB-denied** via
`rh_le_historico`)"*. O `HistoricoBlock` é montado por `HubCandidatoRH.tsx` — o **hub do candidato
visto pelo RH**. O ROADMAP concorda: *"UI hint: yes — 2 páginas públicas net-new + a correção do
Histórico **no lado RH**"*.

**Consequências de desenho, e são três:**

1. A superfície é **desktop-first** (RH), não mobile-first. Ela continua tendo de sobreviver a
   320px, mas não é uma tela de candidato e **não** herda o registro de linguagem simples da BD-3.
2. O argumento do CONTEXT para resolver no servidor **continua válido e fica mais forte**: não é
   sobre o candidato, é sobre `usuarios_rh` ser **admin-only desde a SEG-02** — um recrutador
   comum lendo o hub **não tem** permissão de consultar a tabela de usuários. Mesma razão, mesmo
   remédio, precedente idêntico ao `listar_matriz_retencao` (`20260801000002:259-268`).
3. O rótulo exibido **não pode revelar ao recrutador que um titular pediu exclusão** — Invariante 9
   da 45-UI-SPEC. Isso decide o caso ambíguo do §Rótulos do `ator`, abaixo, e decide contra a
   leitura fácil do CONTEXT.

### 3 · A causa de `ator IS NULL` está invertida no CONTEXT — e "Sistema" × "Recrutador removido" **colidem** se ambos forem derivados de NULL

O CONTEXT trava duas regras que, aplicadas literalmente, se contradizem:

> *"Ator que é trigger automático renderiza o rótulo neutro **"Sistema"** — nunca UUID, nunca vazio."*
> *"**`ator` NULL** renderiza **"Recrutador removido"** … `historico_candidatura.ator` é uma das sete
> colunas que a severação do motor de exclusão zera."*

Hoje `HistoricoBlock.tsx:68` renderiza `{row.ator ?? 'Sistema'}` — NULL **já significa** "Sistema".
Se NULL passar a significar "Recrutador removido", o rótulo de trigger automático desaparece; se
continuar significando "Sistema", o rótulo do CONTEXT nunca aparece. **Um dos dois é sempre falso.**

**O que a severação realmente faz** (`20260805000006_p45_anonimizar_candidato.sql:471-478`):

```sql
UPDATE public.historico_candidatura h
   SET ator = NULL
 WHERE v_user_id IS NOT NULL AND h.ator = v_user_id;
```

`v_user_id` é o `user_id` **do próprio titular que pediu a exclusão** — não o de um recrutador. A
severação zera as linhas em que **o candidato** foi o ator (na prática, a transição de `inscricao`).
**A Phase 45 nunca anula o ponteiro de um recrutador.** A própria migration registra o efeito
colateral e o endereça a esta fase:

> *"⚠ EFEITO COLATERAL REGISTRADO: com `historico_candidatura.ator` nulo a linha passa a PARECER
> escrita pelo sistema. `auto_rejeitado` é boolean ARMAZENADO, então a prova RNF-07a sobrevive —
> mas **qualquer leitor que derive "foi o sistema" de `ator IS NULL` passa a mentir**."*

**O caso real de "Recrutador removido" existe — com outra causa.** É o recrutador cujo `ator` é
não-nulo mas **não resolve** para nenhum usuário vivo em `usuarios_rh` (`deleted_at IS NOT NULL` ou
linha ausente). É o mesmo caso parcial que a 43-UI-SPEC já resolveu para
`listar_matriz_retencao.alterado_por_nome`. **O rótulo do CONTEXT sobrevive; a causa muda.**

O §Rótulos do `ator` abaixo é o contrato corrigido: **quatro condições, quatro rótulos, nenhuma
derivada só de NULL.**

### 4 · O provedor de LLM é **dois** provedores, e a lista de subprocessadores tem mais de quatro nomes

O ROADMAP e o CONTEXT dizem *"o provedor de LLM"*, no singular. Medido:

| Fato medido | Onde |
|---|---|
| **Anthropic** — provedor primário | `_shared/ai-client.ts:341` e as 5 EFs de avaliação |
| **OpenAI** — caminho de **fallback vivo**, não código morto: `gpt-4o-mini`, com `logAiCall({ provider: "openai" })` | `_shared/ai-client.ts:61, 615-663` |
| **ViaCEP** — chamada do **navegador do candidato** durante o cadastro, com o CEP digitado e o IP dele | `src/features/cadastro/services/viaCepService.ts:19` |

Uma página que diga "estas são as empresas" e omita duas delas é exatamente o teatro de compliance
que esta fase existe para remover. **A lista da página é derivada de uma varredura declarada, não
do parêntese do ROADMAP.** Os quatro nomes do critério de sucesso são o **piso**, não o teto. Ver
§`/subprocessadores` para o contrato de conteúdo e a regra "fail high" do campo `país`.

---

## Invariantes não-negociáveis desta fase

Precedem qualquer escolha estética. Um plano que os viole está errado mesmo que fique bonito.

**1 · Toda linha das duas páginas públicas é DERIVADA ou DATADA. Não existe terceira categoria.**
- **Derivada** = vem de um artefato gerado cujo `--check` reprova quando fonte e artefato divergem
  (molde: `gen-recibo-exclusao.cjs` + `npm run check:recibo-exclusao`, 45-02).
- **Datada** = uma afirmação sobre o estado do sistema acompanhada da data em que foi verdadeira
  (molde: `docs/compliance/backup-posture.md`).
Uma frase que não seja nem uma nem outra é uma promessa. **Proibida.**

**2 · O artefato gerado é build-time; a matriz é editável em runtime. A página TEM de declarar a
data de vigência — e a tela do admin TEM de dizer que a edição desatualiza a página.**
Este é o risco central da fase e ele nasce da própria decisão travada. `salvar_janela_retencao`
permite a um administrador mudar uma janela **em produção**, e o `.generated.ts` não muda junto.
No instante seguinte à edição, a página pública **mente** — e mente sobre política de retenção,
numa página que existe para não mentir. Três travas, todas obrigatórias, nenhuma substituindo as
outras:
  1. A página renderiza **"Política vigente em {data}"**, sempre visível, nunca em rodapé de 12px.
  2. Um `check:` no pre-commit reprova quando a fonte declarada e o `.generated.ts` divergem
     (drift de repositório).
  3. **Emenda A** — o `EditarJanelaDialog` diz ao administrador, no momento da confirmação, que a
     página pública precisa ser regenerada (drift de runtime). Sem esta terceira, as duas primeiras
     só detectam a metade do problema que não acontece na prática.

**3 · `/privacidade` (pública) e `/candidato/privacidade` (autenticada) são páginas diferentes com
assuntos diferentes, e o contrato tem de impedir que o executor as confunda.**
A colisão é real e já está no código: `COPY_PRIVACIDADE.secao2` da página autenticada se chama,
hoje, **"O que guardamos e por quê"** — o título literal do TRANSP-02.

| | `/privacidade` (nova, pública) | `/candidato/privacidade` (viva, autenticada) |
|---|---|---|
| Assunto | **a política** — o que o sistema faz com dado de candidato, em geral | **os seus dados** — o que *você* autorizou, o seu currículo, os seus pedidos |
| Sujeito das frases | "candidatos", "os dados" | "você", "seu" |
| Ações | **nenhuma** (só links) | revogar, pedir cópia, apagar |
| H1 | **Privacidade: o que guardamos, por quanto tempo e por quê** | **Seus dados e autorizações** (inalterado) |

A página pública **não** repete os controles da autenticada e **não** contém a palavra "você" como
sujeito de um direito exercível ali. A autenticada **não** é editada por esta fase.

**4 · A página pública nunca afirma mais do que o sistema faz — e o vocabulário de "o que fica" é
o da Phase 45, verbatim.** A expressão é **"sem ligação com você"**. Proibidos: "anonimizado",
"pseudonimizado", "tombstone", "desvinculado", "hash", "irreversível" como adjetivo de processo
técnico. Herança direta da 45-UI-SPEC §Recibo — são termos de engenharia e de jurista, e a página
pública é lida por quem se candidata a uma vaga.

**5 · Nenhuma linha de subprocessador embarca sem os quatro campos travados preenchidos por FATO
MEDIDO.** Nome, finalidade, **país** e base legal (decisão travada do CONTEXT). Se o país ou a base
legal de uma entrada não for medível, a entrada **não vai para a página** e o `check:` reprova —
nunca "não informado", nunca "a definir", nunca um país presumido. `docs/compliance/backup-posture.md`
já registra `region | —` para o próprio Supabase: **o país é um fato a medir no plano, não um fato
conhecido hoje.** Uma página de transferência internacional que chuta o país é pior que uma página
que não existe.

**6 · Zero estado assíncrono nas duas páginas públicas.** Sem skeleton, sem spinner, sem
`role="alert"`, sem "tentar novamente", sem `AsyncState`. Import estático de constante não carrega
e não falha. Um executor que monte um `useQuery` "por consistência com o resto do app" reabre
exatamente a superfície `anon` que o CONTEXT rejeitou.

**7 · Nada nas duas páginas fica atrás de um clique.** Sem `<details>`, sem accordion, sem
`Tabs`, sem "ler mais", sem tooltip carregando conteúdo. Três razões independentes e cada uma
bastaria: (i) conteúdo colapsado é conteúdo que a maioria não lê, e a página existe para ser lida;
(ii) o critério de sucesso diz **"qualquer visitante lê"**; (iii) indexabilidade — texto atrás de
interação é texto que o rastreador pode não alcançar.

**8 · Nenhuma `<table>` em nenhuma das duas páginas.** A matriz é dado tabular; a apresentação é
uma **lista de fichas rotuladas**. Precedente direto e vinculante: o recibo de duas colunas da
45-UI-SPEC (*"'duas colunas' é uma relação semântica, não uma `<table>`"*). Uma `<table>` de 3
colunas a 320px ou rola horizontalmente ou trunca, e as duas coisas estão proibidas.

**9 · Distinção nunca só por cor.** Regra colorblind-safe herdada (ScoreCell / T-34-04-03,
reafirmada em 42, 43, 44 e 45): todo estado carrega **a palavra**. Nesta fase o alvo específico
são os quatro rótulos do `ator` — eles são texto, jamais um ícone, jamais uma cor de linha.

**10 · A superfície do RH não revela que um titular pediu exclusão.** Invariante 9 da 45-UI-SPEC,
herdada verbatim e **load-bearing aqui**: ela é o que decide o caso ambíguo do `ator` severado (ver
§Rótulos do `ator`, nota de resíduo). Um rótulo do tipo "titular removido a pedido" numa linha do
Histórico seria a política de dados de uma pessoa exibida a um recrutador que não pode fazer nada
com ela.

**11 · Nenhum identificador interno em superfície pública nem no Histórico.** Nada de UUID, `id` de
linha, nome de tabela, nome de bucket, SQLSTATE, `prompt_version_id` ou nome de modelo de IA numa
página pública. Na §`/subprocessadores` a empresa é nomeada; o **modelo** não é — modelo é detalhe
de implementação que muda sem aviso e transformaria a página num artefato permanentemente falso.

---

## Emendas registradas a contratos de fases anteriores

Uma só, e ela é obrigatória.

### Emenda A — `DIALOGO_JANELA_COPY.confirmacao` ganha uma linha (43-UI-SPEC)

`EditarJanelaDialog.tsx:96-103` confirma hoje com um bloco `escopo` que descreve o que a alteração
**não** faz. A partir desta fase a mesma alteração passa a ter um efeito novo que o administrador
não pode adivinhar: **ela desatualiza uma página pública.**

| | Copy |
|---|---|
| **Hoje (Phase 43)** | `escopo`: "Nenhum dado de candidato é apagado por esta alteração — e hoje nenhuma rotina deste sistema apaga dados de candidato automaticamente." |
| **Acrescentado (chave nova `publicacao`, o `escopo` fica byte-idêntico)** | **A página pública de privacidade não muda sozinha.** Ela publica a janela que estava valendo na última geração. Depois de salvar, peça a regeneração da página para que o que está publicado volte a bater com o que o sistema faz. |

Três propriedades deliberadas: (i) o `escopo` **não é editado** — é copy aprovada e ainda
verdadeira; (ii) a frase **não promete** regeneração automática, porque não haverá; (iii) ela usa
"peça a regeneração" e não um comando técnico, porque o leitor é um administrador de RH, não quem
roda o build.

**É a única string de outra fase que este contrato altera.** `MATRIZ_COPY`, `MatrizRetencaoTable`,
`AutorizacoesLista`, `GuardaCurriculoBloco`, `PedirCopiaBloco`, `CurriculosBloco`,
`ExcluirDadosBloco`, `ReciboExclusao` e `PrivacidadeCandidatoPage` ficam **byte-idênticos**.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (instalação existente do projeto — **NÃO** re-inicializada; não há `components.json` na raiz; 50+ primitivos vendorizados em `src/components/ui/` desde o M1) |
| Preset | projeto já cabeado; tokens em `src/styles/globals.css`, primitivos em `src/components/ui/` |
| Component library | Radix (via shadcn/ui) |
| Icon library | lucide-react |
| Font | Helvetica Neue, Helvetica, Arial, sans-serif (`--font-family`) |

**Gate do shadcn — decisão registrada (idêntica às Phases 7–17, 42, 43, 44 e 45):** `components.json`
**ausente** e `npx shadcn init` **deliberadamente não executado**. Vários primitivos vendorizados
carregam imports com versão embutida (`@radix-ui/react-slot@1.1.2`) resolvidos por `resolve.alias`
no `vite.config.ts`; rodar o init reescreveria esses arquivos e quebraria o alias. Não é lacuna, é
o estado travado do projeto.

**Shell das duas páginas públicas — clonada, não inventada.** O molde é o `ScreenShell` que
`PrivacidadeCandidatoPage` clonou de `ExplicacaoCandidatoPage` e que está travado desde o M1:

```
BackgroundImage background="gradient" overlayColor="bg-black" overlayOpacity={15}
  └── container mx-auto px-4 max-w-2xl py-20
        └── GlassPanel variant="white" blur="xl"
              └── <h1> + <p subtítulo> + N × <section className="space-y-4 border-t border-white/15 pt-6">
```

**`max-w-2xl`, não `max-w-5xl`.** O `ManifestoPage` usa `max-w-5xl` e `GlassCard p-8 md:p-12`;
**não é o molde aqui.** Estas duas páginas são prosa de leitura corrida, e medida de linha larga é
o que faz prosa jurídica ficar ilegível. O `max-w-2xl` é o mesmo das quatro seções de
`/candidato/privacidade`, que é a superfície-irmã de assunto.

**Rotas novas: duas.** `/privacidade` e `/subprocessadores`, ambas na seção `ROTAS PÚBLICAS` de
`src/router/routes.tsx`, ao lado de `/manifesto` (linha 147) — sem `ProtectedRoute`, sem
`ErrorBoundary` próprio (não há nada que falhe: Invariante 6).

### Âncora visual primária (uma por tela — declarada, não inferida)

- **`/privacidade`:** a **matriz de retenção** (bloco 1). É o que o SC#1 exige que exista e é a
  única coisa da página que é dado derivado; tudo mais é contexto para ela.
- **`/subprocessadores`:** a **lista de empresas**. A página não tem outro conteúdo com peso.
- **`HistoricoBlock`:** inalterada — continua sendo a **linha de transição** `{origem} → {destino}`
  a 14px/600. O nome do recrutador é metadado subordinado e **não pode** ganhar peso que compita
  com a transição (ver §Typography).

**Primitivos shadcn em escopo:** **nenhum.** As duas páginas são `<section>`, `<h1..h3>`, `<p>`,
`<ul>/<li>`, `<dl>/<dt>/<dd>` e `<Link>`, dentro dos componentes glass do projeto. **Nenhum
`table`** (Invariante 8), **nenhum `accordion`/`collapsible`** (Invariante 7), **nenhum `card`**
(o glass do projeto já é o card), **nenhum `sonner`** (não há ação, logo não há desfecho a anunciar).

**Componentes do projeto reusados (não re-autorar):**

| Componente | Papel nesta fase |
|-----------|------------------|
| `BackgroundImage` (`src/components/BackgroundImage.tsx`) | Fundo `gradient` + overlay 15% das duas páginas |
| `GlassPanel` / `Glass` (`src/components/ui/glass.tsx`) | Painel das duas páginas; fichas dos blocos |
| `BeautySmileLogo` | Topo das duas páginas — é conteúdo público, e uma página de privacidade sem marca identificável é uma página que não identifica o controlador |
| `HubSection` (`src/features/hub-candidato/`) | **Inalterado.** O `HistoricoBlock` continua dentro dele |
| `RECIBO_EXCLUSAO` (`src/features/privacidade/constants/reciboExclusao.generated.ts`) | **Fonte derivada do bloco 2 de `/privacidade`** — a coluna `colunas_mantem` já traz item + base legal + a redação travada "sem ligação com você", gerada e sob `check:recibo-exclusao`. Reusar; **jamais** redigir de novo |
| `gen-recibo-exclusao.cjs` (`docs/compliance/sql/`) | **Molde** do gerador da matriz: mesma forma de `--check`, mesmo cabeçalho "⚠ ARQUIVO GERADO — NÃO EDITAR À MÃO", mesma reprovação nas duas direções |
| `ENCARREGADO_EMAIL` (`src/features/privacidade/components/AutorizacoesLista.tsx`) | O canal humano nomeado nas duas páginas. **Uma constante, nunca um literal novo** |
| `ETAPA_M2_LABELS` (`src/features/triagem/services/triagemService.ts`) | Rótulos pt-BR dos 8 estados da matriz. O gerador consome **estes**, nunca inventa rótulo |
| `AsyncState` | **NÃO é usado.** Precedência declarada para o executor não o alcançar por reflexo — não há estado assíncrono nesta fase (Invariante 6) |

---

## Spacing Scale

Escala estabelecida (múltiplos de 4), idêntica às UI-SPECs aprovadas das Phases
11/13/14/15/34/42/43/44/45. **Nenhum valor novo.**

| Token | Value | Usage nesta fase |
|-------|-------|------------------|
| xs | 4px | Gap rótulo↔valor dentro de uma ficha (`space-y-1`) |
| sm | 8px | Linhas dentro de uma ficha (`space-y-2`); gap entre itens de lista |
| md | 16px | Padding interno das fichas (`p-4`); gap do grid `sm:grid-cols-2` (`gap-4`) |
| lg | 24px | Ritmo vertical entre os blocos das páginas (`space-y-6`); `pt-6` do separador de seção |
| xl | 32px | Não usado nesta fase — registrado para completude da escala |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | Respiro superior/inferior da página (`py-20`, herdado da shell) |

**Exceções (todas múltiplos de 4, todas com precedente):**

- `min-h-[44px]` (44 = 4×11) — piso de alvo tátil em **todo** controle acionável desta fase. Nesta
  fase os controles acionáveis são **apenas links**: os 2–4 links do `RodapePublico`, o link
  cruzado entre as duas páginas, e o ponteiro para `/candidato/privacidade`. **Um link é um alvo
  tátil.** Um `<a>` de texto corrido com 20px de altura numa página mobile-first não cumpre o piso,
  e este é o modo de falha mais provável desta fase inteira — ver E4 · `long-text`.
- `max-w-2xl` no container e `px-4` nas laterais — herdados verbatim da shell.

**Explicitamente sem exceção nova.** As fichas usam o molde de container dos blocos irmãos de
`/candidato/privacidade`, verbatim: `rounded-lg border border-white/15 bg-white/5 p-4`. Sem padding
maior, sem borda mais forte, sem sombra própria.

---

## Typography

Família Helvetica Neue (`--font-family`). Exatamente **4 tamanhos, 2 pesos**. Body 1.5, heading 1.2.
Escala idêntica ao contrato aprovado das Phases 11/13/14/15/42/43/44/45 — não re-derivada.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / prosa das páginas públicas / valor de um campo de ficha / rótulo de link | 16px (`text-base`) | regular (400) | 1.5 |
| Label / rótulo de campo dentro da ficha / citação de base legal / nome do recrutador / carimbo de vigência | 14px (`text-sm`) | semibold (600) | 1.4 |
| Título de bloco ("O que guardamos e por quanto tempo", "Com quem compartilhamos") | 20px (`text-xl`) | semibold (600) | 1.2 |
| H1 das duas páginas | 28px (`text-3xl`, cap responsivo `md:text-4xl`) | semibold (600) | 1.2 |

**Notas:**

- A proximidade 14/16 é intencional e separada perceptualmente por **peso** — precedente das Phases
  11/13/14/15/42/43/44/45, não uma micro-banda.
- **A prosa das páginas públicas é leitura de carga, não legenda:** 16px / 1.5
  (`text-base leading-relaxed`), nunca truncada, nunca em `text-sm`, **nunca dentro de um
  `<details>`/accordion** (Invariante 7).
- **O carimbo "Política vigente em {data}" é 14px/600, e é o único lugar da página onde 14px carrega
  informação de peso jurídico.** Ele **não** pode ser 12px: um carimbo de vigência em letra miúda é
  a forma clássica de dizer a verdade sem que ninguém leia.
- Somente dois pesos: 400 e 600. Nada de 500/700/800, apesar de existirem em `globals.css`.
- **O `ManifestoPage` não é referência tipográfica.** Ele usa `text-[24px]`, `font-bold` e emojis em
  título — estado legado, fora de todo contrato de UI-SPEC. Um executor que "siga o precedente da
  outra página pública" importa três violações de uma vez.

### `text-xs` (12px) — o 5º tamanho, e por que ESTA fase o REMOVE de uma linha

`globals.css:79` resolve `--text-xs` em **12px**, sem alias para 14px. O achado cross-phase
`.planning/todos/pending/ui-spec-text-xs-quinto-tamanho.md` continua aberto e **não** é resolvido
aqui — mas esta fase não o agrava e o reduz em um sítio.

- **As duas páginas públicas autoram zero `text-xs`.**
- **`HistoricoBlock.tsx:67` é editado de `text-xs` para `text-sm`** — a linha de metadado
  (`{ator} · {data}`) inteira, não só o nome. Ver Decisão **D-47-U07** para a justificativa e a
  alternativa recusada. Em resumo: esta fase existe para tornar aquele token legível como **prova de
  autoria numa trilha de decisão sob a RNF-07a**, e entregar essa prova no menor tamanho da tela —
  abaixo do piso de 14px que todas as UI-SPECs recentes sustentam — seria entregar o oposto do
  requirement.

---

## Color

Paleta **travada** — idêntica às Phases 11/13/14/15/34/42/43/44/45.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#00109E` brand-primary (`--primary`; `BackgroundImage background="gradient"`) | Fundo das duas páginas atrás de todo glass |
| Secondary (30%) | `bg-white/5`–`bg-white/20` branco translúcido (`Glass`/`GlassPanel`) | Painel das páginas, fichas da matriz, fichas de subprocessador, `RodapePublico` |
| Accent (10%) | `#35BFAD` brand-accent (`--accent`) | **ZERO usos nesta fase** — ver abaixo |
| Destructive | `#EF4444` (`--destructive`) | **ZERO usos nesta fase** — ver abaixo |

**Accent (`#35BFAD`) reservado para — a lista tem ZERO itens.**

Esta fase não cria item de menu, não cria estado ativo de navegação e não pinta nenhum CTA (não há
CTA: as páginas não têm ação). A declaração é explícita porque a ausência é o risco: um executor que
ache a página pública "sem graça" e pinte o link do rodapé, o carimbo de vigência ou a coluna de
prazo com accent estará dando destaque de marca a informação regulatória — e o `ManifestoPage`,
logo ao lado nas rotas públicas, usa `border-[#35BFAD]` como enfeite decorativo em nove lugares. O
precedente errado está a um arquivo de distância.

**Destructive (`#EF4444`) reservado para — a lista tem ZERO itens.**

Não há erro possível (Invariante 6), não há ação destrutiva, não há alerta. Em particular:

- **"Recrutador removido" NÃO é vermelho e não é um alerta.** Ninguém errou. É o mesmo tratamento
  neutro que a 43-UI-SPEC deu a "Não identificado" e que a 45-UI-SPEC exigiu para "Encerrada a
  pedido do candidato" (`text-white/80`, sem borda, sem ícone).
- **A janela de retenção mais longa não é vermelha, nem âmbar.** Prazo não é severidade. Colorir
  "24 meses" de âmbar transformaria um fato de política numa insinuação de risco.

### Tratamentos semânticos (data-encoding — fora do orçamento de accent)

| Tratamento | Classes | Onde |
|-----------|---------|------|
| Ficha neutra / leitura | `rounded-lg border border-white/15 bg-white/5 p-4` | Cada estado da matriz de retenção; cada subprocessador; cada item do bloco "o que fica" |
| Rótulo de campo dentro da ficha | `text-sm font-semibold text-white/70` | "Por quanto tempo", "Por quê", "País", "Base legal" |
| Valor do campo | `text-base leading-relaxed text-white/90` | O conteúdo derivado |
| Carimbo de vigência | `text-sm font-semibold text-white/70` | "Política vigente em {data}" |
| Metadado do Histórico (`{ator} · {data}`) | `text-sm text-white/60`, com o **nome** em `font-semibold text-white/80` | `HistoricoBlock` |

**Todas as fichas de subprocessador têm tratamento visual IDÊNTICO — e isso é contrato.** Pintar
um provedor de IA diferente dos outros (mais escuro, com borda de aviso, com ícone de alerta)
transformaria um relato factual em um julgamento, e faria a página sugerir que a Beauty Smile
desconfia de um fornecedor que ela mesma escolheu. A distinção entre entradas é feita por
**conteúdo**, canal que sobrevive ao daltonismo, ao leitor de tela e à impressão em preto e branco
(Invariante 9).

---

## Copywriting Contract

Toda a copy em **pt-BR**. Regras de produto herdadas e vinculantes: "avaliação
comportamental/cognitiva", **nunca** "teste psicológico" (CLAUDE.md / RNF-07a); nenhuma copy pode
implicar rejeição automática por score (RNF-07a); nenhum score, banda ou percentil em superfície
pública; **nunca** "pessoa natural" (43 / BD-3).

**Registro de linguagem:** linguagem simples que o candidato decodifica, **com** a citação legal ao
lado, nunca no lugar dela (precedente BD-3). O Histórico é a exceção declarada: é superfície de RH
(Correção factual 2) e usa o vocabulário interno do funil que já vive lá.

### Bans desta fase e o ESCOPO de cada um — sem isto o critério reprova a copy que a spec exige

Este projeto já produziu **duas vezes** o defeito de escrever um grep repo-wide que reprova a
própria spec (43, "automaticamente"; 44, os verbos de exclusão). Cada ban abaixo traz o seu escopo.

| Strings | Escopo do grep | Esperado | Por que este escopo |
|---|---|---|---|
| `podemos` · `poderemos` · `eventualmente` · `a nosso critério` · `entre outros` · `etc.` · `dentre outras` | **as duas páginas públicas** (`src/features/transparencia/`) | **0** | Invariante 1. São as construções que transformam um fato verificável numa promessa elástica. "Entre outros" numa lista de subprocessadores é literalmente a confissão de que a lista está incompleta |
| `anonimizado` · `pseudonimizado` · `tombstone` · `desvinculado` · `hash` | **as duas páginas públicas** | **0** | Invariante 4 — vocabulário travado desde a 45-UI-SPEC. A redação permitida é **"sem ligação com você"** |
| `todos os seus dados` · `tudo o que temos sobre você` · `apagamos tudo` | **as duas páginas públicas** | **0** | Herança da Invariante 4 da 45: é factualmente falso — a justificativa do recrutador sobrevive sem ligação com o titular e a trilha de decisão sobrevive inteira |
| `não informado` · `a definir` · `TBD` · `a confirmar` | **`/subprocessadores`** | **0** | Invariante 5. Um campo vazio numa declaração de transferência internacional não é um placeholder, é uma omissão publicada |
| `teste psicológico` | repo-wide em copy renderizada de `src/` e `supabase/functions/` | **0** | CLAUDE.md, herdado. O ban já existe em `src/__tests__/copyPortoesLgpd.test.ts`; esta fase **não** o reescreve, só não o viola |
| `Sistema` como rótulo de `ator` | ⚠ **NÃO BANIR.** `HistoricoBlock` continua renderizando "Sistema" | n/a | A Correção factual 3 **mantém** o rótulo. Um plano que leia o CONTEXT literalmente e o remova quebra o caso de transição automática, que é o caso majoritário da trilha |
| `data_deletion_log` · `delete_candidate_data` | **as duas páginas públicas** | **0** | Invariante 11. Nome de tabela e de função em página pública é mapa de schema oferecido de graça — e as duas, especificamente, são o zumbi que esta fase está matando |

### Contrato mínimo do template

| Element | Copy |
|---------|------|
| Primary CTA | **Nenhum.** As duas páginas públicas não têm ação. A declaração é o contrato: um CTA nelas seria conversão enxertada numa peça regulatória. O elemento acionável de maior peso é o link **Com quem compartilhamos os seus dados** (de `/privacidade` para `/subprocessadores`) |
| Empty state heading | **Não existe estado vazio possível** nas duas páginas. Ver a regra "fail high" logo abaixo |
| Empty state body | — |
| Error state | **Não existe estado de erro possível** (Invariante 6). Ver a regra "fail high" logo abaixo |
| Destructive confirmation | **Nenhuma ação destrutiva.** O único `DROP` da fase (CONSOL-03) não tem superfície de UI e é decisão do portão destrutivo, executada por migration |

**A regra "fail high" que substitui os estados vazio e de erro.** Se a derivação devolver lista
vazia — matriz sem estados, ou nenhum subprocessador —, isso **não** é um estado da tela: é **falha
de geração**. O `--check` reprova no pre-commit e o build não passa. A página **nunca** renderiza
"nenhum registro encontrado" para uma matriz que tem 8 estados seedados desde a Phase 43 e um CHECK
que garante `1..24 NOT NULL`. Mesmo raciocínio da 45-UI-SPEC §E4 · empty: *"um recibo vazio ao lado
de um botão que apaga seria a pior tela da fase"* — aqui, uma página de retenção vazia seria a
declaração pública de que a empresa não guarda nada.

---

### `/privacidade` — **Privacidade: o que guardamos, por quanto tempo e por quê** (TRANSP-02)

Mobile-first, sem auth, indexável. Cinco blocos, nesta ordem, separados por
`border-t border-white/15 pt-6`.

| Element | Copy |
|---------|------|
| H1 | **Privacidade: o que guardamos, por quanto tempo e por quê** |
| Subtítulo | Esta página descreve o que o sistema de recrutamento da Beauty Smile **faz** com os dados de quem se candidata a uma vaga — não o que ele pretende fazer. Os prazos abaixo são gerados a partir da configuração que o próprio sistema usa. |
| **Carimbo de vigência** *(Invariante 2, sempre visível, logo abaixo do subtítulo — nunca no rodapé)* | **Política vigente em {dd/mm/aaaa}.** |

#### Bloco 1 — **O que guardamos e por quanto tempo** *(a matriz derivada — âncora visual)*

Uma ficha por estado da candidatura. **8 fichas**, uma por valor do enum `etapa_processo`.

| Campo da ficha | Rótulo | Conteúdo |
|---|---|---|
| Estado | *(o `<dt>` é o próprio título da ficha, 14px/600)* | Rótulo pt-BR de `ETAPA_M2_LABELS` — **"Inscrição"**, **"Triagem"**, **"Avaliação Assíncrona"**, **"Entrevista Online"**, **"Entrevista Presencial"**, **"Decisão Final"**, **"Aprovado"**, **"Rejeitado"** |
| Prazo | **Por quanto tempo** | **{n} meses** a partir do fim do processo. Inteiro puro; **nunca `{n}m`**, nunca "2 anos" quando o dado é `24` — a unidade da fonte é o mês e converter é editar o dado |
| Motivo | **Por quê** | Frase de finalidade + base legal, **14px/600 ao lado do item, nunca em nota de rodapé nem em tooltip** (regra 3 do recibo da 45) |

**Regras da matriz — as seis que o executor não pode relaxar:**

1. **Derivada, nunca digitada.** Fonte única declarada, gerador `.cjs` no molde de
   `gen-recibo-exclusao.cjs`, artefato `.generated.ts` em `src/features/transparencia/constants/`,
   script `check:matriz-retencao` no pre-commit, reprovando **nas duas direções**.
2. **O gerador projeta APENAS `etapa` e `janela_meses`.** As outras três colunas de
   `listar_matriz_retencao` — `origem`, `alterado_por_nome`, `atualizado_em` — **não** vão para a
   página. `alterado_por_nome` é **nome de administrador**: publicá-lo seria trocar transparência
   sobre o candidato por exposição de um funcionário, e a própria RPC existe porque `usuarios_rh` é
   admin-only desde a SEG-02.
3. **Agrupamento proibido.** Hoje as 8 janelas são todas `24` (seed da 43). A tentação de renderizar
   "todos os estados: 24 meses" é forte e está **proibida**: no dia em que um administrador
   encurtar uma janela, a forma agrupada esconde a divergência exatamente onde ela importa.
4. **A coluna "Por quê" é AUTORADA, chaveada por `etapa`, e o gerador falha se faltar chave.** A
   finalidade de cada estado é um fato jurídico que não está em `config_retencao_etapa` — o gerador
   a lê de um mapa versionado ao lado da fonte e **reprova a build** quando um estado da matriz não
   tem entrada. Um estado novo no enum não pode aparecer na página pública sem motivo escrito.
5. **Ordem de funil, não alfabética.** A ordem é a de `ETAPA_M2_OPTIONS` (`inscricao` → `rejeitado`),
   porque é a ordem em que a pessoa vive o processo.
6. **Nenhuma `<table>`** (Invariante 8). Ficha por estado; `sm:grid-cols-2 gap-4` acima de `sm`,
   empilhadas abaixo. Cada ficha carrega os próprios rótulos nos dois breakpoints — é isso que
   preserva o pareamento campo↔valor em coluna única.

#### Bloco 2 — **O que fica mesmo depois de você pedir a exclusão** *(o caso "indefinido")*

Derivado de `RECIBO_EXCLUSAO.colunas_mantem` (`reciboExclusao.generated.ts`, gerado e sob
`check:recibo-exclusao` desde a 45-02). **Reusar; nunca redigir de novo.**

| Element | Copy |
|---------|------|
| Título do bloco | **O que fica mesmo depois de você pedir a exclusão** |
| Abertura | Alguns registros a Beauty Smile é **obrigada** a manter — e eles ficam **sem ligação com você**. Não dá para chegar até a sua pessoa a partir deles. |
| Prazo de cada item | **Por tempo indeterminado — sem ligação com você.** *(seguido da base legal a 14px/600)* |

**Como um prazo "indefinido" lê, e o que é proibido.** A expressão contratada é
**"Por tempo indeterminado — sem ligação com você"**, sempre a frase inteira, sempre com a base
legal ao lado. Proibidas: **"para sempre"**, **"indefinidamente"**, **"permanentemente"** e
**"indefinido"** isolado. As quatro descrevem um dado que continua sendo *sobre a pessoa* e para
sempre — que é precisamente o que **não** acontece: o vínculo é cortado e o que sobrevive é a prova
de não-discriminação exigida pelo Art. 7º, VI. Um prazo indeterminado sem a segunda metade da frase
é a leitura mais assustadora possível de um fato que é protetivo.

**Um prazo indeterminado NUNCA aparece no bloco 1.** `config_retencao_etapa.janela_meses` é
`NOT NULL` com `CHECK (BETWEEN 1 AND 24)`: uma janela indeterminada ali é **impossível por
construção**, e se o gerador emitir uma, isso é falha de geração e a build para (regra "fail high").
O indeterminado vive no bloco 2, e só lá, porque lá ele é um fato jurídico e não um buraco no dado.

#### Bloco 3 — **Com quem compartilhamos**

| Element | Copy |
|---------|------|
| Título | **Com quem compartilhamos** |
| Corpo | Para funcionar, este sistema usa empresas contratadas que tratam dados de candidatos em nome da Beauty Smile. Elas estão todas nomeadas, com o país e a finalidade de cada uma. |
| Link *(alvo tátil ≥44px, 16px)* | **Ver com quem compartilhamos os seus dados** → `/subprocessadores` |

#### Bloco 4 — **Seus direitos**

| Element | Copy |
|---------|------|
| Título | **Seus direitos** |
| Corpo | A LGPD (Art. 18) garante a você pedir acesso, correção e exclusão dos seus dados, entre os direitos previstos em lei. |
| Autoatendimento *(Invariante 3 — nomeia, sem prometer o que a página pública não entrega)* | Se você já tem cadastro, entre na sua conta e use **Seus dados e autorizações**: lá você vê o que autorizou, pede uma cópia dos seus dados e pode apagá-los. |
| Canal humano | Se você não consegue entrar na conta, ou prefere falar com uma pessoa, escreva para o nosso Encarregado de Dados: **{ENCARREGADO_EMAIL}**. |

**O canal humano é obrigatório e vem do Art. 8º §5** — é a única saída de quem perdeu acesso à
conta. A constante é reusada (`ENCARREGADO_EMAIL`), nunca redigitada: dois endereços divergentes em
duas páginas de privacidade é o defeito que a `check:` de copy da Phase 43 existe para pegar.

#### Bloco 5 — **Como esta página é feita** *(a honestidade sobre a própria página)*

| Element | Copy |
|---------|------|
| Título | **Como esta página é feita** |
| Corpo | Os prazos acima não são digitados à mão: são gerados a partir da mesma configuração que o sistema usa para decidir por quanto tempo guardar cada candidatura. Quando a configuração muda, esta página é gerada de novo — por isso ela traz a data em que passou a valer. |

**Este bloco é obrigatório e não é enfeite.** Ele é a única frase honesta possível sobre a
consequência da Invariante 2: a página é build-time e a matriz é runtime. Sem ele, a data de
vigência parece burocracia; com ele, a data é a explicação. Ele **não** promete regeneração
automática — dizer "atualizada automaticamente" seria criar, na página que existe para matar
promessas órfãs, uma promessa órfã.

---

### `/subprocessadores` — **Com quem compartilhamos os seus dados** (TRANSP-01)

Mobile-first, sem auth, indexável. Uma ficha por empresa.

| Element | Copy |
|---------|------|
| H1 | **Com quem compartilhamos os seus dados** |
| Subtítulo | Estas são as empresas contratadas que tratam dados de candidatos em nome da Beauty Smile. Nenhuma delas usa os seus dados para fins próprios. |
| **Carimbo de vigência** | **Lista completa em {dd/mm/aaaa}.** |
| Link de volta | **Ver o que guardamos e por quanto tempo** → `/privacidade` |

#### Os campos de cada ficha — quatro travados pelo CONTEXT, um acrescentado

| Campo | Rótulo | Regra |
|---|---|---|
| Nome | *(título da ficha, 14px/600)* | O nome comercial da empresa. **Nunca** o nome do modelo de IA, do plano contratado ou da região técnica (Invariante 11) |
| **O que recebe** | **O que recebe** | ⚠ **Campo acrescentado — ver D-47-U05.** Sem ele, "finalidade" vira slogan ("melhorar a experiência") em vez de fato ("o seu e-mail e o texto do aviso") |
| Finalidade | **Para quê** | Uma frase, no presente, descrevendo o uso real |
| País | **País** | Fato **medido** (Invariante 5). Sem medição, a ficha não embarca |
| Base legal | **Base legal** | Citação do artigo, 14px/600. Fato carregado de artefato existente do repositório, nunca autorado na hora |

#### As seis entradas medidas — e por que são seis, não quatro

O SC#1 nomeia quatro. A varredura do código vivo encontrou **seis**. As quatro do critério são o
piso.

| Empresa | Onde está medido | Nota para o plano |
|---|---|---|
| **Supabase** | infraestrutura do projeto (Auth, Postgres, Storage, Edge Functions) | O **país** é o que `docs/compliance/backup-posture.md` registra hoje como `region \| —`: **desconhecido, e portanto a medir** |
| **Vercel** | `vercel.json` / hospedagem do front (`STATE.md` §bloqueador de 2026-08-03) | Recebe requisição e IP de quem acessa |
| **Resend** | `supabase/functions/_shared/email-config.ts` + as EFs `notificar-candidato` / `notificar-rh` | ⚠ A EF em modo `teste` envia o **corpo inteiro** para `resend.dev` (T-42-24). Isso é fato de tratamento e o plano decide se é fato de produção |
| **Anthropic** | `_shared/ai-client.ts:341` e as 5 EFs de avaliação | Provedor de IA **primário** |
| **OpenAI** | `_shared/ai-client.ts:61, 615-663` — `gpt-4o-mini`, com `logAiCall({ provider: "openai" })` | Caminho de **fallback vivo**, não código morto. Omiti-lo é publicar uma lista falsa |
| **ViaCEP** | `src/features/cadastro/services/viaCepService.ts:19` | Chamada do **navegador do candidato** durante o cadastro, com o CEP digitado e o IP dele. O plano decide se qualifica como operador; **se decidir que não, a decisão fica registrada** — omitir em silêncio é o que está proibido |

**A entrada dos dois provedores de IA tem uma regra de precisão própria.** O input passa por
`maskPII()` (`_shared/pii-masker.ts`) antes de sair. A copy pode dizer **o que o código
comprovadamente mascara** e **nada além disso** — o mascaramento é por regex e um nome digitado
dentro de um texto livre não é alcançado por ele. Proibido escrever "de forma anônima", "sem
identificação" ou "anonimizado" (Invariante 4). A redação permitida é factual e derivada da lista
de padrões que o `maskPII` de fato remove, medida no plano.

**Vocabulário travado desta página.** A palavra escolhida na copy visível é **"empresas
contratadas"**, não "subprocessadores" nem "operadores" — os dois últimos são termos da lei que a
maioria dos candidatos não decodifica (registro BD-3). A **rota** continua sendo
`/subprocessadores` porque é o termo que um leitor técnico ou um auditor procura, e a URL é a única
parte desta página cujo público inclui quem fiscaliza.

---

### `HistoricoBlock` — os rótulos do `ator` (CONSOL-02 / VISRH-03)

**Sem tela nova.** A edição é de **uma linha de metadado** (`HistoricoBlock.tsx:67-68`) mais a
origem do dado. O resto do componente — a transição, a data, o `criterio_texto`, o estado vazio, a
`HubSection` — fica **byte-idêntico**.

#### Os quatro rótulos, e a condição de cada um — resolvidos NO SERVIDOR

O nome é resolvido na RPC/view que serve o histórico (decisão travada do CONTEXT), pelo mesmo
`LEFT JOIN` server-side que `listar_matriz_retencao` já usa. O cliente **nunca** consulta
`usuarios_rh` e **nunca** recebe um UUID.

| # | Condição (avaliada no servidor) | Rótulo renderizado |
|---|---|---|
| 1 | `ator` resolve para uma linha de `usuarios_rh` com `deleted_at IS NULL` | **{nome_completo}** — nome completo, nunca primeiro nome (decisão travada) |
| 2 | `ator` é o `user_id` do próprio candidato daquela candidatura | **O próprio candidato** |
| 3 | `ator` é não-nulo e **não** resolve para nenhum usuário RH vivo (linha ausente ou `deleted_at IS NOT NULL`) | **Recrutador removido** |
| 4 | `ator IS NULL` | **Sistema** |

**Regras que acompanham a tabela:**

- **`ativo = false` com `deleted_at IS NULL` continua exibindo o NOME.** Desativado não é removido,
  e quem agiu naquela data agiu. Rebaixar um recrutador desativado a "Recrutador removido" apagaria
  autoria real de uma trilha que a RNF-07a existe para preservar.
- **A linha 2 é obrigatória e é a que o CONTEXT não previu.** Sem ela, a transição de `inscricao` —
  em que o ator é o próprio candidato — cairia na linha 3 e a tela diria "Recrutador removido" sobre
  uma pessoa que nunca foi recrutadora e que está ali mesmo. É um erro pior que o UUID, porque é
  legível e errado.
- **Nenhum dos quatro rótulos é "Não identificado".** Aquele rótulo já significa **falha de
  resolução** nas Phases 42/43/44, e reusá-lo aqui daria dois significados à mesma palavra na mesma
  aplicação (regra herdada da 45-UI-SPEC §RH).
- **Nunca UUID, nunca célula vazia, nunca `—`, nunca a linha omitida.** Omitir a linha apagaria
  trilha de decisão — recusa explícita do CONTEXT, e o que a RNF-07a protege.
- **Nenhuma cor, nenhum ícone, nenhum badge distingue os quatro** (Invariante 9). São quatro
  strings no mesmo tratamento tipográfico.

> ⚠ **Resíduo conhecido, declarado e ACEITO — e a razão é a Invariante 10.**
> Depois de uma exclusão da Phase 45, a linha de `inscricao` do titular tem `ator = NULL` e passa a
> cair na condição 4, lendo **"Sistema"** — quando quem agiu foi o titular. A migration
> `20260805000006:471-476` já registra o efeito e o endereça a esta fase.
> **Não é corrigido, e não por falta de meio, mas por decisão:** o único rótulo que descreveria o
> fato ("autor removido a pedido") informaria a um recrutador, numa tela de funil, que **aquela
> pessoa específica exerceu o direito de exclusão** — exatamente o que a Invariante 9 da 45-UI-SPEC
> proíbe (*"A tela do RH não exibe … que existe um pedido de exclusão"*). Entre uma imprecisão de
> autoria numa linha e um vazamento de exercício de direito, o contrato escolhe a imprecisão, com o
> resíduo escrito aqui em vez de descoberto depois.
> `auto_rejeitado` permanece como boolean **armazenado** e a prova da RNF-07a sobrevive a ele.

#### Formatação

- Datas do Histórico: **inalteradas** (`d 'de' MMM, HH:mm` via `date-fns`/`ptBR`, o idioma vivo do
  componente). Esta fase não toca `formatData`.
- Datas das páginas públicas: **`dd/mm/aaaa`** via `toLocaleDateString('pt-BR', …)` — idioma vivo do
  projeto e o mesmo da 45-UI-SPEC.
- Data ausente ou inválida no carimbo de vigência: **falha de geração, não estado de tela.** O
  `--check` reprova; a página não renderiza "Política vigente em —".

---

### "Indexável" — o que o contrato exige e o que ele NÃO cria

O CONTEXT trava *"100% público: sem auth, indexável"*. Medido: o projeto **não tem** `robots.txt`,
**não tem** `react-helmet` e o `index.html` traz um único `<title>` global. Esta fase **não**
acrescenta dependência de SEO (invariante de zero-npm do M8). "Indexável" aqui significa,
operacionalmente, **três propriedades verificáveis por teste de render**:

1. **Rota sem guard** — as duas entradas ficam na seção `ROTAS PÚBLICAS` de `routes.tsx`, sem
   `ProtectedRoute`, sem redirecionamento por sessão.
2. **Nenhuma meta `noindex`** é adicionada por esta fase — e nenhuma existe hoje.
3. **Todo o conteúdo está no DOM inicial, em texto** — nada atrás de clique, de `Tabs`, de
   `<details>` ou de estado de componente (Invariante 7). É a mesma propriedade que a
   acessibilidade exige, medida pelo mesmo teste.

Um `robots.txt` e metadados por rota são **melhoria fora do escopo desta UI-SPEC** — não são UI, e
prometê-los aqui criaria a promessa órfã que a fase remove.

---

### `RodapePublico` — a alcançabilidade, e o precedente que ela corrige

> ⚠ **Fato medido que contradiz o CONTEXT.** O CONTEXT chama `/manifesto` de *"precedente vivo de
> rota 100% pública"*. Ele é precedente de **rota**, não de **alcançabilidade**: `/manifesto` é
> referenciado em exatamente dois lugares (`routes.tsx:147` — a rota — e `routes.tsx:560` — o
> `DevNavigationMenu`, **gateado por `import.meta.env.DEV`**). **Nenhuma navegação de produção leva
> a ele.** Copiar esse precedente entregaria duas páginas que satisfazem o critério "existe" e
> falham o critério "qualquer visitante lê".
>
> O `STATE.md` registra o mesmo modo de falha já pago uma vez nesta aplicação, em 2026-08-03:
> *"Dashboard sem a navbar compartilhada … quem caía no dashboard ficava sem caminho até a revogação
> do próprio consentimento."*

| Item | Contrato |
|---|---|
| Componente | `RodapePublico` (`src/features/transparencia/components/`) |
| Conteúdo | Exatamente **dois links**: **Privacidade** → `/privacidade` · **Com quem compartilhamos** → `/subprocessadores` |
| Tratamento | `border-t border-white/15 pt-6`, links 16px/400 `text-white/80`, **`min-h-[44px]` em cada link**, empilhados abaixo de `sm:`, lado a lado com `gap-4` acima |
| Onde é montado | `/` (`LandingPage`), `/vagas` (`VagasPublicasPage`), `/vagas/:identifier` (`VagaDetalhePage`) — as três rotas públicas de conversão — **e** nas duas páginas novas, onde ele é o link cruzado entre elas |
| Onde **não** é montado | `/manifesto` (fluxo de leitura com CTA próprio), rotas de auth, `/candidato/**`, `/rh/**`, `/admin/**`. As internas já têm navegação própria e um rodapé novo ali é ruído sem função |
| Proibido | Logo, endereço, telefone, redes sociais, texto de copyright, newsletter, qualquer terceiro link. **É um rodapé de alcançabilidade, não um rodapé institucional** — cada item a mais dilui os dois que o critério de sucesso exige |
| Regra de não-regressão | As três páginas onde ele é montado recebem **apenas** o componente como último filho do container existente. **Nenhuma outra linha delas é editada** — nem estilo, nem layout, nem copy |

---

## Component Inventory (for the planner)

### Feature nova — `src/features/transparencia/`

| Componente / módulo | Papel |
|---------------------|-------|
| `PrivacidadePublicaPage` (`components/`) | `/privacidade` inteira: shell + os 5 blocos + carimbo de vigência. Zero hook, zero query |
| `SubprocessadoresPage` (`components/`) | `/subprocessadores` inteira: shell + lista de fichas + carimbo. Zero hook, zero query |
| `MatrizRetencaoPublica` (`components/`) | As 8 fichas do bloco 1, alimentadas **só** pelo `.generated.ts`. Sem props de dado vindo de rede |
| `RetencaoIndeterminadaLista` (`components/`) | O bloco 2, derivado de `RECIBO_EXCLUSAO.colunas_mantem` |
| `SubprocessadorFicha` (`components/`) | Uma ficha de cinco campos. **Um componente para todas** — dois componentes divergiriam na primeira edição, e a divergência apareceria entre duas declarações públicas |
| `RodapePublico` (`components/`) | Os dois links de alcançabilidade (§acima) |
| `matrizRetencao.generated.ts` (`constants/`) | **ARQUIVO GERADO.** Cabeçalho no molde de `reciboExclusao.generated.ts`, incluindo o aviso "NÃO EDITAR À MÃO" e a linha de regeneração |
| `subprocessadores.ts` (`constants/`) | Autorado e versionado — mas cada campo é fato medido, e o `check:` reprova campo vazio (Invariante 5) |
| `COPY_TRANSPARENCIA` (`constants/`) | Toda a copy estática das duas páginas, no molde de `COPY_PRIVACIDADE`/`COPY_GUARDA_CURRICULO`. **Nenhuma string literal dentro de JSX** — é o que torna os bans de copy testáveis |

### Gerador e portões

| Arquivo | Papel |
|---------|-------|
| `docs/compliance/sql/gen-matriz-retencao.cjs` | Gerador no molde **verbatim** de `gen-recibo-exclusao.cjs`: `--check` reprova nas duas direções, saída determinística, sem dependência npm nova |
| `package.json` → `check:matriz-retencao` | Terceiro irmão de `check:export-allowlist` e `check:recibo-exclusao`, no pre-commit |

### Edições em arquivos existentes — a lista fechada

| Arquivo | O que muda | O que **não** muda |
|---------|-----------|--------------------|
| `src/router/routes.tsx` | +2 entradas na seção `ROTAS PÚBLICAS` | Nenhuma rota existente |
| `src/features/hub-candidato/components/HistoricoBlock.tsx` | A linha de metadado: `text-xs` → `text-sm`; `{row.ator ?? 'Sistema'}` → o rótulo resolvido | Transição, data, `criterio_texto`, estado vazio, `HubSection` |
| `src/features/hub-candidato/services/historicoCandidaturaService.ts` | Passa a ler a RPC/view com o nome resolvido; `HistoricoRow` ganha o campo de rótulo | A `HISTORICO_ALLOWLIST` continua **explícita, jamais `'*'`** — o guard de PII (`[[reference_select_star_leaks_pii]]`) é o motivo de o arquivo existir |
| `src/features/admin/retencao/components/EditarJanelaDialog.tsx` | +1 chave `publicacao` em `DIALOGO_JANELA_COPY.confirmacao` (**Emenda A**) | `escopo` e todo o resto: byte-idênticos |
| `LandingPage.tsx` · `VagasPublicasPage.tsx` · `VagaDetalhePage.tsx` | +`<RodapePublico />` como último filho | Todo o resto |

### As reutilizações que o plano NÃO pode transformar em cópia

1. **`RECIBO_EXCLUSAO`** já é gerado, já traz base legal por item e já usa a redação travada "sem
   ligação com você". Redigir o bloco 2 à mão criaria **duas** declarações públicas sobre o mesmo
   fato, divergindo na primeira edição — e a divergência apareceria entre o que a página promete e
   o que o recibo entrega.
2. **`ETAPA_M2_LABELS`** é a fonte dos rótulos pt-BR dos 8 estados. Um segundo mapa de rótulos faria
   a página pública e a tela do RH chamarem a mesma etapa por nomes diferentes.
3. **`ENCARREGADO_EMAIL`** é constante única. Um literal novo é um segundo endereço a auditar.
4. **`gen-recibo-exclusao.cjs`** é o molde do gerador, incluindo a forma do `--check` e do cabeçalho.
   Um gerador com contrato de falha diferente é um portão que reprova de outro jeito — e portões que
   reprovam de jeitos diferentes é como um deles para de ser lido.

---

## UI Considerations

Derivado do `ui-consideration-probe` com **`elements` autorados**. A nota metodológica das
42/43/44/45-UI-SPECs vale aqui integralmente e **não é opcional**: o classificador do probe usa cues
em inglês (`tables?`, `forms?`, `lists?`) e a prosa deste projeto é pt-BR, então `tabela`,
`ficha` e `rodapé` não casam com cue nenhum — classificar pela prosa produziria falso verde.

Cobertura: **30 aplicáveis · 30 resolvidas · 0 não resolvidas** — **21 explícitas (✅), 9 backstop (🧪)**.

Elementos sondados: **E1** prosa e blocos estáticos das duas páginas públicas (`static-content`) ·
**E2** `MatrizRetencaoPublica` (`list-collection` · `static-content`) · **E3** lista de
`SubprocessadorFicha` (`list-collection` · `static-content`) · **E4** `RodapePublico` (`nav`) ·
**E5** `HistoricoBlock` com o rótulo do `ator` (`list-collection` · `static-content`).

> **Reprodutibilidade da contagem.** `static-content` levanta `overflow` + `long-text`;
> `list-collection` levanta `empty`, `loading`, `error`, `populated`, `partial`, `overflow`,
> `zero-one-many`; `nav` levanta `loading`, `error`, `overflow`, `long-text`. Logo:
> E1 = 2 · E2 = 8 · E3 = 8 · E4 = 4 · E5 = 8 → **30**. A união `list-collection ∪ static-content`
> em E2/E3/E5 é **declarada de propósito**: sem `static-content`, a categoria `long-text` não seria
> levantada e as três linhas onde a proibição de truncar base legal e nome próprio é travada
> sumiriam em silêncio — o motor devolveria 27.

> **Nota de método, herdada da 43/44/45:** onde o risco real de um elemento é **semântico** e não
> dimensional, ele é registrado na categoria de forma mais próxima (`long-text` para
> `static-content`, `error` para `list-collection`) com a resolução dizendo o risco de verdade.

| # | Elemento | Category | Status | Resolution / Reason |
|---|----------|----------|--------|---------------------|
| E1 | Prosa das páginas públicas | overflow | ✅ covered | Altura livre dentro de `max-w-2xl px-4`; sem contêiner de altura fixa, sem scroll interno, **sem accordion e sem `<details>`** (Invariante 7). A 320px a prosa quebra em mais linhas — nunca em scroll horizontal |
| E1 | Prosa das páginas públicas | long-text | 🧪 backstop | O risco real não é comprimento: é a copy **prometer** em vez de declarar. **Backstop:** asserção negativa das strings da §Bans **no escopo declarado** (`src/features/transparencia/`), somada à asserção de que o carimbo de vigência está presente e renderiza uma data válida em ambas as páginas. Um teste de snapshot não serve — ele passaria numa página que ficou falsa sem mudar de texto |
| E2 | `MatrizRetencaoPublica` | empty | ✅ covered | **Impossível por construção.** 8 estados seedados desde a Phase 43 com `ON CONFLICT DO NOTHING`, `janela_meses NOT NULL CHECK (1..24)`. Derivação vazia = **falha de geração**: o `check:matriz-retencao` reprova e a build para. A página **nunca** renderiza "nenhum registro" — seria a declaração pública de que a empresa não guarda nada |
| E2 | `MatrizRetencaoPublica` | loading | ✅ covered | **Estado inexistente por desenho** (Invariante 6): import estático de `.generated.ts`, zero rede, zero `useQuery`. Sem skeleton, sem spinner. Registrado explicitamente para o executor não montar um por reflexo de consistência com o resto do app |
| E2 | `MatrizRetencaoPublica` | error | 🧪 backstop | O risco não é de rede — é **staleness**: o artefato é build-time e a matriz é editável em runtime (Invariante 2). **Backstop triplo:** (i) `--check` reprovando fonte×artefato nas duas direções; (ii) asserção de que o carimbo de vigência renderiza; (iii) asserção de que `DIALOGO_JANELA_COPY.confirmacao.publicacao` existe e é renderizada no `AlertDialog` de salvar janela (Emenda A). Sem a (iii), o drift de runtime não tem detector nenhum |
| E2 | `MatrizRetencaoPublica` | populated | ✅ covered | 8 fichas na ordem do funil (`ETAPA_M2_OPTIONS`), cada uma com estado + prazo + motivo. `sm:grid-cols-2 gap-4` acima de `sm:`, empilhadas abaixo. Rótulos de campo visíveis **nos dois breakpoints** |
| E2 | `MatrizRetencaoPublica` | partial | 🧪 backstop | O caso perigoso é um estado da matriz **sem entrada no mapa de "Por quê"** — uma etapa nova no enum chegaria à página pública com prazo e sem motivo. **Backstop:** teste do gerador provando que uma etapa sem chave de finalidade **reprova a build**, nunca renderiza ficha com campo vazio. Um teste que só valide as 8 chaves de hoje passaria e não pegaria a nona |
| E2 | `MatrizRetencaoPublica` | overflow | ✅ covered | **Nenhuma `<table>`** (Invariante 8). Fichas de altura livre; a 320px cada campo ocupa a linha inteira. Sem `truncate`, sem `line-clamp`, sem scroll horizontal |
| E2 | `MatrizRetencaoPublica` | zero-one-many | ✅ covered | O número é **fixo em 8** e o cabeçalho do bloco é neutro quanto ao número ("O que guardamos e por quanto tempo") — não há singular/plural a errar. **Agrupamento proibido** (regra 3): 8 janelas iguais continuam sendo 8 fichas, porque colapsá-las esconderia a divergência do dia em que uma mudar |
| E3 | `SubprocessadorFicha` (lista) | empty | ✅ covered | **Impossível por construção**: a aplicação não roda sem Supabase e Vercel. Lista vazia = falha de geração/varredura → `check:` reprova. Uma página de subprocessadores vazia afirmaria "não compartilhamos com ninguém", que é o oposto do fato |
| E3 | `SubprocessadorFicha` (lista) | loading | ✅ covered | **Estado inexistente por desenho** (Invariante 6) — constante versionada, import estático |
| E3 | `SubprocessadorFicha` (lista) | error | 🧪 backstop | O risco é a **lista ficar incompleta em silêncio** — foi exatamente o que a Correção factual 4 mediu (OpenAI e ViaCEP ausentes do parêntese do ROADMAP). **Backstop:** teste que confronta a lista publicada com uma varredura declarada dos destinos de rede do repositório (`src/**` + `supabase/functions/**`) e falha quando existe destino externo sem entrada correspondente ou decisão registrada. Uma asserção de contagem fixa ("são 6") passaria e apodreceria no primeiro fornecedor novo |
| E3 | `SubprocessadorFicha` (lista) | populated | ✅ covered | Uma ficha por empresa, todas com **tratamento visual idêntico** (§Color) e os cinco campos rotulados. Nenhuma ficha destacada, nenhuma ordenada por "risco" |
| E3 | `SubprocessadorFicha` (lista) | partial | 🧪 backstop | O caso perigoso é **país ou base legal ausente** — e `backup-posture.md` já registra `region \| —` para o próprio Supabase, então este caso **existe hoje**. **Backstop:** asserção de que nenhuma entrada embarca com campo vazio, `null`, `"não informado"` ou `"a definir"`; a entrada incompleta **reprova o `check:`**, nunca renderiza (Invariante 5) |
| E3 | `SubprocessadorFicha` (lista) | overflow | ✅ covered | Fichas empilhadas, altura livre, `sm:grid-cols-2` acima de `sm:`. Sem `<table>`, sem scroll horizontal a 320px |
| E3 | `SubprocessadorFicha` (lista) | zero-one-many | ✅ covered | Cabeçalho neutro quanto ao número ("Com quem compartilhamos os seus dados"). A lista cresce sem mudar copy; nenhuma frase do tipo "as quatro empresas abaixo" — que a Correção factual 4 já teria tornado falsa |
| E3 | `SubprocessadorFicha` (lista) | long-text | ✅ covered | Nome de empresa, finalidade e base legal renderizam **íntegros**: sem `truncate`, sem `line-clamp`, sem `title` como substituto. Truncar a base legal de uma transferência internacional é apagar a justificativa que a torna legítima (regra herdada do recibo da 45) |
| E4 | `RodapePublico` | loading | ✅ covered | Dois `<Link>` estáticos; sem estado, sem dado, sem render assíncrono |
| E4 | `RodapePublico` | error | ✅ covered | Sem estado de erro possível. As rotas são estáticas em `routes.tsx`; um destino quebrado é erro de compilação de rota, não estado de tela |
| E4 | `RodapePublico` | overflow | ✅ covered | Empilhado abaixo de `sm:`, lado a lado com `gap-4` acima. Nunca fixo, nunca sobreposto ao conteúdo, nunca `position: sticky` — um rodapé grudado comeria dobra numa tela de 320px |
| E4 | `RodapePublico` | long-text | 🧪 backstop | O risco medido não é o texto — é o **alvo tátil**: um `<a>` de texto corrido tem ~20px de altura e o piso deste projeto é 44px. É o modo de falha mais provável da fase inteira, e é invisível em teste de texto. **Backstop:** asserção estrutural de que **cada** link do rodapé carrega `min-h-[44px]` (ou equivalente medido), no molde dos testes de alvo tátil das Phases 42–45 |
| E5 | `HistoricoBlock` (rótulo do `ator`) | empty | ✅ covered | **Inalterado.** `rows.length === 0` continua renderizando "Sem movimentações registradas" + a copy de apoio da 34-UI-SPEC. Esta fase não toca o vazio |
| E5 | `HistoricoBlock` (rótulo do `ator`) | loading | ✅ covered | **Inalterado.** `isLoading` continua delegando ao skeleton da `HubSection`. O rótulo do ator **nunca** aparece meio-resolvido: ele vem pronto do servidor, na mesma resposta das outras colunas |
| E5 | `HistoricoBlock` (rótulo do `ator`) | error | ✅ covered | **Inalterado.** `isError` continua na copy de erro da `HubSection`. A resolução do nome é uma coluna a mais na mesma leitura — não introduz caminho de falha novo, e é exatamente por isso que a decisão travada de resolver **no servidor** é também a decisão de menor risco |
| E5 | `HistoricoBlock` (rótulo do `ator`) | populated | ✅ covered | Metadado `{rótulo} · {data}` a **14px**, nome em `font-semibold text-white/80`, data em `text-white/60`. Nome **completo**, nunca abreviado (decisão travada). O peso continua **subordinado** à linha de transição, que é a âncora da seção |
| E5 | `HistoricoBlock` (rótulo do `ator`) | partial | 🧪 backstop | O risco central da fase inteira: os **quatro rótulos** e a colisão medida na Correção factual 3. **Backstop:** teste dos quatro recortes — RH vivo → nome; `ator` = `user_id` do candidato → "O próprio candidato"; `ator` não-nulo sem usuário vivo → "Recrutador removido"; `ator IS NULL` → "Sistema" — **mais** a asserção negativa de que nenhum UUID e nenhuma célula vazia alcançam o DOM em nenhum dos quatro. Um teste só do caminho feliz passaria com a colisão presente |
| E5 | `HistoricoBlock` (rótulo do `ator`) | overflow | ✅ covered | A linha de metadado já é `flex flex-wrap gap-x-3 gap-y-1`: um nome completo longo quebra para a linha seguinte em vez de empurrar a data para fora. Nenhuma largura fixa é introduzida |
| E5 | `HistoricoBlock` (rótulo do `ator`) | zero-one-many | ✅ covered | Uma transição, várias e nenhuma têm o mesmo tratamento (`<ol>` de itens rotulados) — inalterado. O rótulo do ator é por linha e não depende da contagem |
| E5 | `HistoricoBlock` (rótulo do `ator`) | long-text | 🧪 backstop | Dois riscos num só token: um `nome_completo` longo **truncado** (perderia a autoria que o requirement veio entregar) e o vazamento de PII pela porta ao lado — a projeção da leitura tem de continuar **nomeada**, jamais `'*'`, porque a RLS é row-level e não esconde coluna. **Backstop:** (i) asserção de que o nome renderiza íntegro, sem `truncate`/`line-clamp`/`title`, com fixture de nome longo; (ii) asserção de que a `HISTORICO_ALLOWLIST` continua explícita e não ganhou `email` nem `id` de usuário RH |

<!-- Status vocabulary (locked by probe-core projectTruths):
     ✅ covered   → a plain truth string lifted into must_haves.truths
     🧪 backstop  → a flat scalar { statement, verification: backstop }; at verify time, no explicit
                    evidence → insufficient_spec → human_needed (never a silent pass, #1154)
     ⚠ unresolved → an explicit planner assumption (surfaced, never silently dropped)
     Rows are REPLACED (not appended) on a probe re-run — idempotent. -->

### Acessibilidade (piso, não varredura completa)

- **Todo link acionável com `min-h-[44px]`** — os dois do `RodapePublico`, o link cruzado entre as
  páginas e o ponteiro para `/candidato/privacidade`. É o único piso tátil desta fase, e é o único
  que ela pode violar (E4 · `long-text`).
- **Cada ficha usa cabeçalho REAL** (`<h3>` ou `<dt>`), nunca um `<div>` em negrito. Em coluna
  única, o rótulo do campo é a única coisa que preserva o pareamento campo↔valor — mesma razão
  pela qual a 45-UI-SPEC exigiu cabeçalho nos dois breakpoints do recibo.
- **A matriz e a lista de empresas são `<ul>`/`<dl>` semânticos**, não `<div>` empilhados: um
  leitor de tela precisa anunciar "lista de 8 itens" para que a pessoa saiba quando terminou.
- **Ícones decorativos com `aria-hidden="true"`** — inclusive o `ArrowRight` que já existe no
  `HistoricoBlock` (já está correto; não regredir).
- **Os quatro rótulos do `ator` alcançam o leitor de tela pela palavra**, nunca por cor, nunca por
  posição (Invariante 9).
- **Contraste:** todo texto de conteúdo em `text-white/80` ou mais opaco sobre o glass. `text-white/60`
  é permitido **apenas** para a data do Histórico — metadado redundante, nunca a única fonte de um
  fato. Nenhum texto de conteúdo em `text-white/50` nas páginas públicas.
- **`<html lang="pt-BR">`** já vale para a aplicação inteira; esta fase não o altera e não introduz
  texto em outro idioma. Nomes próprios de empresa (Supabase, Vercel, Resend, Anthropic, OpenAI,
  ViaCEP) são nomes, não estrangeirismos a traduzir.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | **nenhum bloco novo** — esta fase não usa primitivo shadcn algum (§Design System) | not required — nenhum `add`/`init` executado; todos os primitivos do projeto já estão vendorizados em `src/components/ui/` desde o M1 |
| third-party | **nenhuma declarada** | not applicable |

Nenhuma registry de terceiros declarada → **nenhum** gate `shadcn view`/diff necessário e nenhum
bloco de terceiro entra no contrato.

**Zero dependência npm nova** (invariante do M8, herdada do M7). Explicitamente **rejeitados**:
qualquer biblioteca de SEO/meta (`react-helmet` e afins — ver §Indexável), qualquer biblioteca de
tabela (Invariante 8), qualquer biblioteca de markdown para renderizar a política (a copy é
constante tipada em `COPY_TRANSPARENCIA`, e markdown em runtime seria uma superfície de HTML
injetável numa página pública), e qualquer parser de YAML novo no gerador — `gen-recibo-exclusao.cjs`
já resolveu esse problema e é o molde.

---

## Decisões tomadas em nome do operador (modo autônomo)

Esta UI-SPEC foi gerada dentro de `/gsd-autonomous`, **sem pergunta ao operador**. As 16 decisões
do `47-CONTEXT.md` estão travadas e foram honradas. Tudo abaixo é escolha minha, dentro da
§"Claude's Discretion" do CONTEXT ou forçada por um fato medido no código. **Cada uma traz a
alternativa recusada**, para que o operador possa reverter uma sem reabrir o resto.

| # | Decisão | Alternativa recusada | Por quê |
|---|---|---|---|
| **D-47-U01** | **H1 da página pública é "Privacidade: o que guardamos, por quanto tempo e por quê"**, e a página autenticada mantém "Seus dados e autorizações" | Reusar o título "O que guardamos e por quê" (que já é o `COPY_PRIVACIDADE.secao2` da página autenticada) | Dois títulos idênticos em duas rotas com nomes quase iguais (`/privacidade` × `/candidato/privacidade`) é a fábrica de confusão que a Invariante 3 existe para impedir — para o visitante e para o executor |
| **D-47-U02** | **Criar `RodapePublico`** com dois links, montado em `/`, `/vagas` e `/vagas/:identifier` | Não criar navegação (seguir o precedente literal de `/manifesto`) | Medido: `/manifesto` só é alcançável pelo `DevNavigationMenu`, **gateado por `import.meta.env.DEV`**. Copiar esse precedente entregaria duas páginas que ninguém encontra, falhando o SC#1 ("qualquer visitante lê") com o código todo escrito. O `STATE.md` já registra este modo de falha pago uma vez em 2026-08-03 |
| **D-47-U03** | **Zero dado em runtime nas duas páginas** — nenhum hook, nenhuma query, nenhum estado de loading/erro | Um `useQuery` com fallback estático "por consistência com o resto do app" | Consequência direta da decisão travada de não expor `listar_matriz_retencao` a `anon`. Também elimina 6 estados de tela que não teriam como ser testados honestamente |
| **D-47-U04** | **A matriz vira lista de fichas rotuladas, não `<table>`**; agrupamento de janelas iguais proibido | `<table>` de 3 colunas (o dado é tabular), ou uma linha só dizendo "todos os estados: 24 meses" | `<table>` a 320px trunca ou rola horizontalmente — as duas coisas proibidas pelas restrições da fase, e o recibo da 45 já resolveu isto assim. O agrupamento esconde a divergência no dia exato em que ela importa |
| **D-47-U05** | **Cada subprocessador ganha um 5º campo, "O que recebe"**, além dos quatro travados | Só os quatro campos do CONTEXT (nome, finalidade, país, base legal) | Não contradiz a decisão travada — acrescenta. Sem ele, "finalidade" degenera em slogan ("melhorar a experiência") em vez de fato ("o seu e-mail e o texto do aviso"), e a página vira exatamente o teatro que a fase remove |
| **D-47-U06** | **A lista de empresas tem 6 entradas medidas, não as 4 do critério de sucesso** — Anthropic **e** OpenAI, mais ViaCEP; e o `país` de cada uma é fato a MEDIR no plano, com a entrada bloqueada se não for medível | Publicar os quatro nomes do parêntese do ROADMAP | Medido: OpenAI é fallback vivo com `logAiCall({ provider: "openai" })`, e ViaCEP recebe CEP + IP do navegador do candidato. Uma lista que diz "estas são as empresas" e omite duas é falsa. O `país` é bloqueante porque `backup-posture.md` registra `region \| —` — hoje ele é **desconhecido**, e chutá-lo numa declaração de transferência internacional é pior que não ter a página |
| **D-47-U07** | **`HistoricoBlock` sobe a linha de metadado de `text-xs` (12px) para `text-sm` (14px)** | Manter 12px (não mexer no que a fase não precisa mexer) | Esta fase existe para tornar aquele token uma **prova de autoria numa trilha sob a RNF-07a**. Entregar essa prova no menor tamanho da tela, abaixo do piso de 14px que todas as UI-SPECs recentes sustentam, seria autorar o 5º tamanho por omissão na linha exata que a fase veio consertar. Reduz em um sítio o achado aberto `ui-spec-text-xs-quinto-tamanho.md` sem tentar fechá-lo |
| **D-47-U08** | **Quatro rótulos de `ator`, não três** — acrescentado **"O próprio candidato"**, e "Recrutador removido" passa a ser derivado da **falha de resolução**, não de `ator IS NULL` | Os três rótulos do CONTEXT, com "Recrutador removido" em `ator IS NULL` | Correção factual 3: com três rótulos derivados de NULL, "Sistema" e "Recrutador removido" colidem e um dos dois é sempre falso. E sem o quarto, a transição de `inscricao` diria "Recrutador removido" sobre o próprio candidato |
| **D-47-U09** | **O resíduo do `ator` severado é ACEITO e escrito**, não corrigido: depois de uma exclusão da 45, a linha de `inscricao` lê "Sistema" | Criar um 5º rótulo ("autor removido a pedido") que descrevesse o fato | O 5º rótulo informaria a um recrutador, numa tela de funil, que aquela pessoa exerceu o direito de exclusão — o vazamento que a Invariante 9 da 45-UI-SPEC proíbe textualmente. Entre imprecisão de autoria e vazamento de exercício de direito, o contrato escolhe a imprecisão **declarada** |
| **D-47-U10** | **Emenda A** — o `EditarJanelaDialog` ganha uma frase dizendo que a página pública precisa ser regenerada | Deixar o drift de runtime sem detector, confiando só no `check:` de repositório | O `check:` só pega divergência **no repositório**. A edição que realmente desatualiza a página acontece **em produção**, pela tela do admin — e sem esta frase ninguém no sistema jamais sabe que a página pública ficou falsa |
| **D-47-U11** | **"Indexável" é entregue por três propriedades verificáveis** (rota sem guard, sem `noindex`, conteúdo em texto no DOM inicial); **nenhuma** dependência de SEO e **nenhum** `robots.txt` prometido | Adicionar `react-helmet` + metadados por rota | Invariante de zero-npm do M8. E prometer metadados numa UI-SPEC sem código que os entregue seria criar, nesta fase, a promessa órfã que ela existe para eliminar |
| **D-47-U12** | **A copy visível diz "empresas contratadas"; a rota continua `/subprocessadores`** | Usar "subprocessadores" ou "operadores" na copy visível | Registro de linguagem simples da BD-3 — os dois termos são da lei e a maioria dos candidatos não os decodifica. A URL é a única parte da página cujo público inclui quem fiscaliza, e para esse leitor o termo técnico é o achável |
| **D-47-U13** | **Numeração de requirement do `REQUIREMENTS.md`** (Histórico = CONSOL-02), não a do CONTEXT | Seguir o CONTEXT (Histórico = CONSOL-01) | O canônico é o `REQUIREMENTS.md`, corroborado pelo `COMMENT` da migration viva `20260805000006:938`, que chama o problema do `ator` de "dependência declarada da W-1/CONSOL-02 da Phase 47" |

**Ponto de atenção para o operador, em uma frase:** se apenas uma destas decisões merecer revisão
humana antes do plano, é a **D-47-U06** — ela muda uma lista pública de quatro para seis nomes e
declara um campo (`país`) como bloqueante de embarque.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
