# Phase 44: Exportação & Acesso — Research

**Researched:** 2026-08-03
**Domain:** LGPD Art. 18, II / Art. 19, II — direito de acesso self-service · Supabase Edge Function + Storage signed URL · allowlist derivada de inventário · snapshot/catalog drift guard
**Confidence:** MEDIUM-HIGH (in-repo: HIGH e medido; catálogo vivo de PROD: **NÃO MEDIDO nesta sessão** — ver §Live-Catalogue Measurement Protocol)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

*Copiadas verbatim de `44-CONTEXT.md` §Implementation Decisions. As 4 áreas cinzentas foram
**aceitas integralmente pelo operador em 2026-08-03**.*

**Área 1 · Forma da entrega do export**

- **Síncrono.** O candidato clica, a EF responde o payload, o navegador baixa. Não há fila, não há
  worker, não há e-mail no caminho. Justificativa dimensional: 21 candidatos vivos e um payload de
  poucos KB — assíncrono introduziria três componentes para resolver um problema de escala que este
  sistema não tem. (O pipeline `notificar-candidato` do M7 continua disponível se a escala mudar;
  não é usado aqui.)
- **O candidato recebe DOIS arquivos gerados do mesmo objeto:** um `.json` (o direito do Art. 18, II
  — "formato que permita a sua utilização") e uma versão legível por humano. O JSON sozinho satisfaz
  a letra e falha o adjetivo do goal: uma cópia **honesta** é uma que a pessoa consegue ler.
- **A superfície mora em `/candidato/privacidade`**, como bloco novo. A Phase 43 criou aquela página
  declarando-a textualmente "a CASA que a Phase 44 (pedir cópia dos dados) e a Phase 45 (pedir
  exclusão) vão ocupar" (`PrivacidadeCandidatoPage.tsx:6-8`). Rota nova seria contradizer uma
  decisão de arquitetura de informação já tomada e já construída.
- **Cooldown de 24h por candidato — e o cooldown É o registro do pedido.** Uma decisão, dois
  efeitos: sem linha registrada não existe marco a partir do qual medir o prazo do SC#4, e sem cap
  o endpoint é um amplificador de exfiltração (um atacante com sessão válida itera o export à
  vontade). O cooldown vive na tabela, nunca em memória.

**Área 2 · A allowlist e o artefato de inventário (EXPORT-02 / EXPORT-06)**

- **A allowlist é DERIVADA do `docs/compliance/pii-inventory.yaml`**, não escrita à mão. O YAML da
  Phase 42 (64/64 tabelas, 993 colunas, colhido do catálogo VIVO de PROD) já declara em
  `meta.consumidores` a linha `"Phase 44 — allowlist explícita do export (EXPORT-02)"`. Escrever a
  allowlist à mão em TypeScript criaria a segunda fonte de verdade que o SC#5 existe para impedir.
- **O artefato do SC#5 é `docs/compliance/export-allowlist.json`** — commitado, com bloco `meta`
  carregando versão e `consumidores:` declarando a Phase 45, no mesmo padrão que o
  `pii-inventory.yaml` já estabeleceu. Gerado do YAML por script versionado; **não** parseado em
  runtime pela EF (isso adicionaria um parser YAML ao caminho de execução).
- **Escopo = tudo classificado como PII do titular no inventário**, não apenas `candidatos` +
  `candidaturas`: incluir `autorizacoes`, `agendamentos_entrevista`, `historico_candidatura` e as
  avaliações/respostas. Uma cópia que omite o que o RH enxerga sobre a pessoa não é honesta.
- **Saídas de IA entram — o RESULTADO e a EXPLICAÇÃO, nunca o prompt nem a telemetria.** O Art. 20
  dá direito à explicação e o sistema já a expõe ao candidato em `/explicacao` desde o M2; omitir do
  export o que a UI já mostra seria incoerente. `ai_call_logs` **não** entra (prompt, custo,
  telemetria interna — não é dado do titular no sentido do Art. 18, II).

**Área 3 · Mecânica anti-vazamento (SC#2 / SC#3)**

- **EF nova `exportar-meus-dados`**, clone estrutural de `get-curriculo-url`: two-client (D-23),
  authenticate-THEN-authorize, `createClient` como import estático de `esm.sh`, projeção por
  allowlist. RPC `SECURITY DEFINER` foi descartada porque não minta signed URL de Storage — o
  caminho RPC exigiria uma segunda chamada e portanto duas superfícies de autorização para um único
  pedido.
- **O teste do SC#3 tem DUAS asserções, e essa é a decisão de projeto mais importante da área:**
  1. **Vitest** — snapshot das chaves de `export-allowlist.json`. Pega remoção silenciosa e
     alteração acidental da allowlist. Roda no CI.
  2. **Smoke SQL contra o catálogo vivo** — compara `information_schema.columns` das tabelas do
     escopo contra a allowlist e falha em coluna **nova** ou **sumida** no banco.

  A asserção (1) sozinha **não detecta a coluna nova no banco**, que é literalmente o modo de falha
  que o SC#3 nomeia. Este projeto já embarcou uma vez a classe "guarda que era dead code"
  (P39/CR-02); uma asserção que não pode falhar pelo motivo declarado é a mesma classe de defeito.
- **TTL do signed URL = 60 s**, idêntico a `get-curriculo-url:createSignedUrl(path, 60)`. A duração
  canônica de um signed URL neste projeto já existe; um segundo número exigiria justificar por que o
  CV do próprio dono merece uma janela mais frouxa que o CV visto pelo RH. (`perfilRhService.ts:294`
  usa 3600 s — contexto diferente, foto de perfil, não é precedente para PII.)
- **Autorização own-row estrita, derivada do JWT.** O `candidato_id` **nunca** vem do corpo do
  request — é resolvido server-side a partir de `auth.uid()`. Aceitar identificador do cliente é a
  classe T-32-03 (Tampering) já catalogada na Phase 32. O RH **não** usa este endpoint.

**Área 4 · Prazo do Art. 19, II e visibilidade do RH (SC#4)**

- **Tabela nova `solicitacoes_dados` com coluna `tipo`** — `acesso` nesta fase, `exclusao` na Phase
  45. Nasce genérica de propósito: a P45 vai precisar exatamente de fila + prazo + RLS sobre pedidos
  do titular, e retrofitar `tipo` depois seria migration sobre linhas vivas numa fase que já carrega
  o portão destrutivo integral.
- **`config_sla_dados` espelhando `config_sla_revisao`** — limiares alteráveis sem deploy. Os 15 dias
  corridos do Art. 19, II são o **teto legal**, não o limiar de atenção; os limiares de
  atenção/atraso ficam abaixo dele e são configuráveis. Reusar `config_sla_revisao` acoplaria dois
  prazos legais distintos (Art. 20 e Art. 18/19) na mesma linha.
- **`/rh/pedidos-dados`** — rota nova, clone estrutural de `RevisoesRHPage` + `FilaRevisoesTable` +
  `RevisaoSlaBadge`. Aba dentro de `/rh/revisoes` misturaria Art. 20 (revisão de decisão) com Art.
  18 (acesso aos dados).
- **A fila do RH é de SUPERVISÃO, não de execução.** Como o export é self-service, a linha nasce
  `atendido` com carimbo automático. O RH vê o que foi pedido, quando e por quem — e, sobretudo,
  vê o que ficou **`pendente`** (falha da EF, CV ausente do Storage, erro de permissão). **Um pedido
  que falhou é o único que consome prazo**, e é exatamente esse que o SC#4 precisa tornar
  distinguível de um recém-chegado.

### Claude's Discretion

Forma exata do payload JSON (aninhamento, nomes de chave, envelope de metadados), formato concreto
da versão legível, script de geração do `export-allowlist.json`, DDL fina de `solicitacoes_dados` e
`config_sla_dados`, e desenho visual dos blocos novos. Guiar-se pelo ROADMAP, pelos critérios de
sucesso, pela `43-UI-SPEC` e pelas convenções vivas do repositório.

### Deferred Ideas (OUT OF SCOPE)

- **Export assíncrono via `notificar-candidato`** — desnecessário na escala atual (21 candidatos);
  reabrir só se o payload ou a base crescerem.
- **RH exportar dados em nome do candidato** — pertence à superfície de atendimento, não a esta
  fase; a P45 traz o fluxo RH sobre pedidos do titular.
- **`tipo = 'exclusao'` em `solicitacoes_dados`** — a coluna nasce aqui, o valor entra na Phase 45.
- **`ai_call_logs` no export** — deliberadamente fora do escopo (telemetria interna, não dado do
  titular). Se algum dia entrar, é decisão nova e nomeada.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (verbatim de `.planning/REQUIREMENTS.md:81-86`) | Research Support |
|----|-------------|------------------|
| **EXPORT-01** | Candidato solicita cópia dos próprios dados pelo painel | §Architecture Patterns P1 (bloco em `/candidato/privacidade`) · §Code Examples §E1 (mutation + duplo download) · shell herdado, medido em `PrivacidadeCandidatoPage.tsx:185-200` |
| **EXPORT-02** | Export em JSON por allowlist explícita de colunas — nunca `select('*')`, a classe de vulnerabilidade nº 1 recorrente deste projeto | §Architecture Patterns P2 (gerador YAML→JSON) + P3 (EF projeta pela allowlist) · §Pitfall 1 · **58 ocorrências vivas de `select('*')` em `src/` + `supabase/functions/` medidas em 2026-08-03** |
| **EXPORT-03** | Currículo entregue por signed URL de TTL curto a partir de bucket privado, nunca inline nem base64 | §Achado #1 (o `CvButton` NÃO é reusável como está — `get-curriculo-url` é RH-only) · §Open Question OQ-1 · §Code Examples §E3 |
| **EXPORT-04** | Chaves do export cobertas por snapshot test — uma coluna nova no banco não pode vazar silenciosamente para o export | §Validation Architecture §Two-Assertion Design · §Code Examples §E4 (Vitest) e §E5 (smoke SQL) |
| **EXPORT-05** | Pedido de acesso atendido dentro do prazo do **Art. 19, II** (15 dias corridos) | §Architecture Patterns P4/P5 (`solicitacoes_dados` + `config_sla_dados`) · §Achado #4 (escopo por vaga na fila RH) |
| **EXPORT-06** | O inventário construído aqui é o artefato consumido pelo motor de exclusão (EXPORT antes de ERASE) | §Architecture Patterns P2 (`meta.consumidores` + `meta.versao`) · §Live-Catalogue Measurement Protocol |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Diretivas acionáveis extraídas de `./CLAUDE.md`. Têm a **mesma autoridade** que as decisões
travadas do CONTEXT — nenhuma recomendação desta pesquisa as contradiz.

| # | Diretiva | Consequência para esta fase |
|---|----------|------------------------------|
| C1 | **NUNCA** usar `supabaseAdmin` ou service_role key no client-side | A EF `exportar-meus-dados` é o único lugar com `service_role`; o cliente usa apenas o client anon de `src/lib/supabase/` |
| C2 | Operações privilegiadas vão para Edge Functions (`supabase/functions/`) | Confirma a Área 3 do CONTEXT |
| C3 | RLS habilitado em 100% das tabelas com dados de usuário | `solicitacoes_dados` e `config_sla_dados` nascem com `ENABLE ROW LEVEL SECURITY` + policies explícitas |
| C4 | `database.types.ts` gerado pelo Supabase CLI — **NUNCA editar manualmente** | Após as duas migrations: `npm run db:types` |
| C5 | Enums DB em snake_case pt-BR (`status_vaga`, `etapa_processo`) | `tipo` ∈ {`acesso`,`exclusao`}, `situacao` ∈ {`atendido`,`pendente`}, causas em pt-BR |
| C6 | Features em `src/features/<dominio>/` com components/hooks/services/schemas/types | `src/features/pedidos-dados/` (RH) + bloco dentro de `src/features/privacidade/` (candidato) |
| C7 | Componentes PascalCase.tsx, **export nomeado** (nunca default) | `lazyNamed` na rota (§P6) |
| C8 | Services `camelCaseService.ts` com classes de erro customizadas | `exportacaoService.ts` + `pedidosDadosService.ts` com `PedidosDadosError` |
| C9 | Query keys hierárquicas | `pedidosDadosKeys.list(filtros)`, `.configSla()`, `.pendentesCount()` |
| C10 | Linguagem de produto: "avaliação comportamental/cognitiva", **nunca** "teste psicológico" | Vale dentro dos **dois arquivos gerados**, não só na tela |
| C11 | Sistema **NUNCA** rejeita candidato automaticamente por score (RNF-07a) | Nada nesta fase toca decisão; o export só **lê** |
| C12 | **Workaround 42601** — migrations com `$$…$$` adjacentes a `COMMENT`/`GRANT`/`REVOKE` falham no pooler; aplicar pelo SQL Editor + `supabase migration repair --status applied <version>`; **sem** wrapper `BEGIN;/COMMIT;` | §G — Migration Mechanics (prescrição explícita) |

---

## Summary

Esta fase tem **três riscos reais e um risco imaginário**. O imaginário é a escrita: a fase é
aditiva e read-only sobre PII, o portão destrutivo não se aplica, e nada aqui pode perder dado. Os
três reais são todos de **projeção**: o que a allowlist inclui, quem consegue mintar um signed URL,
e se o guarda que deveria pegar uma coluna nova consegue mesmo pegá-la.

O trabalho de pesquisa produziu **quatro achados que mudam o plano** em relação ao que o CONTEXT e a
UI-SPEC assumem. O maior de longe: **`CvButton` não é reusável como está no lado do candidato**. Ele
chama `cvUploadService.getSignedUrl` → EF `get-curriculo-url`, que no passo 2 exige
`usuarios_rh.role ∈ {rh, administrador}` e devolve **403 a qualquer candidato**
(`get-curriculo-url/index.ts:139-141`). O componente é hoje importado num único sítio, e esse sítio
é uma tela de RH (`HubCandidatoRH.tsx:305`). A boa notícia é que existe um caminho **menor** que uma
EF nova: o bucket privado `curriculos` tem policy de SELECT own-folder viva
(`20260715000001_curriculos_drop_rh_read.sql:34-41`), e o Supabase declara `createSignedUrl:
['SELECT']` sobre `storage.objects` — ou seja, **o próprio candidato, com o próprio JWT e o client
anon, minta o próprio signed URL de 60 s sem service_role nenhum**. Isso satisfaz o EXPORT-03 com
superfície de exfiltração estritamente **menor** que a alternativa por EF, e não contradiz nenhuma
decisão travada (a Área 3 fala do **payload do export**, e a Invariante 4 da UI-SPEC fala de
**quando** a URL é cunhada, não de **quem** a cunha).

O segundo eixo é o guarda do SC#3. Não existe **um único** snapshot test no repositório
(`toMatchSnapshot`/`toMatchInlineSnapshot`/`toMatchFileSnapshot`: **zero ocorrências** em `src/`,
`supabase/`, `scripts/` e `tests/` em 2026-08-03; nenhum diretório `__snapshots__`). A técnica
estreia aqui, e a decisão certa é `toMatchInlineSnapshot` — porque o valor do guarda está em o
**diff aparecer no PR**, e um `.snap` externo é o arquivo que o revisor não abre. Mas nenhuma
asserção Vitest, de forma nenhuma, detecta uma coluna nova **no banco**; para isso a segunda
asserção tem de ser um **smoke SQL versionado** em `docs/compliance/sql/` que faz o `FULL OUTER
JOIN` entre `information_schema.columns` e a allowlist e falha nos dois sentidos. O idioma já existe
neste projeto (`01-pii-catalog.sql`, `04-invent05-blast-radius.sql`) e a execução é do
**orquestrador via MCP**, nunca do subagente.

O terceiro eixo é o inventário. `docs/compliance/pii-inventory.yaml` é uma semente excelente — 64
tabelas, 993 colunas, vocabulário de 4 classificações, regras R1–R5 de cobertura, e o bloco
`meta.consumidores` já nomeando esta fase. Mas ele foi colhido em **2026-07-29** e o projeto tem
**drift PROD→repo documentado e recorrente** (quarta instância na Phase 43). O YAML é a semente da
**classificação**; a lista de **colunas** tem de vir da medição do catálogo vivo feita no momento do
planejamento. E há uma armadilha de vocabulário: o YAML classifica para a **Phase 45** (o que
apagar/anonimizar/preservar), não para a Phase 44 (o que **mostrar ao titular**). Os dois eixos são
ortogonais e a derivação precisa de uma regra explícita — a §Architecture Patterns P2 propõe uma.

**Primary recommendation:** trate o `export-allowlist.json` como o artefato central da fase — gere-o
do YAML com um script `--check`-able no idioma exato de `gen-pii-md.cjs`, embuta-o na EF como import
estático (nunca parse de YAML em runtime), e prove-o com as duas asserções. Para o EXPORT-03, minte
o signed URL no cliente com o JWT do próprio candidato sobre a policy own-folder viva, mantendo o
`service_role` inteiramente fora do caminho do CV do titular.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Montar o payload de export por allowlist | **API / Edge Function** (`exportar-meus-dados`, service_role) | Database (RLS como 2ª camada) | RLS é *row*-level e não esconde coluna; a projeção por allowlist tem de ser server-side. C1/C2 |
| Resolver `candidato_id` do titular | **API / Edge Function** (de `auth.uid()`) | — | Aceitar id do cliente é T-32-03 (Tampering). Decisão travada, Área 3 |
| Enforcar o cooldown de 24 h | **Database** (linha em `solicitacoes_dados`) + **EF** (leitura+recusa) | Browser (só apresentação) | Invariante 3 da UI-SPEC: o cliente nunca decide. O cooldown "vive na tabela, nunca em memória" |
| Registrar o pedido (`solicitacoes_dados`) | **API / Edge Function** (service_role) | Database (RLS de leitura own-row) | A linha `pendente` precisa nascer **mesmo quando a EF falha depois** — ver §Pitfall 4 |
| Mintar o signed URL do CV do titular | **Browser / Client** (client anon + JWT do candidato) | Database (RLS `storage.objects` own-folder) | `createSignedUrl` exige SELECT em `storage.objects`; a policy own-folder já autoriza. Tira `service_role` do caminho do CV — superfície menor. **Ver OQ-1** |
| Gerar os dois arquivos (`.json` + `.html`) | **Browser / Client** (funções puras) | — | `Blob`+anchor same-origin; zero npm; testável sem DOM. Idioma de `baixarIcsAgendamento` |
| Derivar `export-allowlist.json` do YAML | **Build / offline script** (`node`, commitado) | CI (`--check`) | Artefato **versionado**, não computado em runtime. Evita parser YAML na EF |
| Detectar coluna nova/sumida no banco | **Database** (smoke SQL contra `information_schema`) | CI (Vitest sobre o JSON) | Vitest não enxerga o catálogo; SQL não roda no CI deste repo. **As duas, não uma** |
| Fila de supervisão do RH | **Database** (RPC `SECURITY DEFINER` com escopo explícito) | Frontend (render + faixa) | Espelha `listar_revisoes_decisao`: o DEFINER bypassa RLS, então o escopo é predicado explícito |
| Classificar a faixa de acompanhamento | **Browser / Client** (`classifyRevisaoSla`, puro e total) | Database (limiares em `config_sla_dados`) | Reuso por alias — decisão travada da UI-SPEC §Component Inventory |

---

## Standard Stack

### Core — **zero dependência npm nova**

Nada nesta fase precisa de biblioteca nova. As quatro coisas que "pediriam" uma (PDF, ZIP, parser
YAML em runtime, biblioteca de tabela) foram todas explicitamente rejeitadas pela UI-SPEC
§Registry Safety.

| Library | Version (medida) | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| `@supabase/supabase-js` | `^2.104.0` (dep declarada) | Client anon no browser; `createSignedUrl`; `functions.invoke` | Já é a única fronteira de rede do projeto [VERIFIED: package.json:33] |
| `@supabase/supabase-js` (esm.sh) | `https://esm.sh/@supabase/supabase-js@2` | Two-client dentro da EF | Import **estático** — a forma runtime-construída causou `ERR_MODULE_NOT_FOUND` em P10-13 [VERIFIED: supabase/functions/get-curriculo-url/index.ts:46] |
| `@tanstack/react-query` | `^5.90.10` | `useMutation` do export; `useQuery` da fila e da config | Padrão vivo em toda leitura de servidor [VERIFIED: package.json:35] |
| `date-fns` | `^2.30.0` | `differenceInCalendarDays` dentro de `diasEmEspera` (reusado, não reescrito) | [VERIFIED: package.json:41 + src/features/revisao/constants/slaRevisao.ts:34] |
| `lucide-react` | `^0.487.0` | `FileDown` (menu), `Loader2`, `AlertTriangle` | [VERIFIED: package.json:47] |
| `vitest` | `^4.1.9` | Snapshot inline do SC#3 + suítes de unidade | [VERIFIED: package.json:104] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `js-yaml` | **3.14.2 — presente APENAS como dependência TRANSITIVA** | Ler `pii-inventory.yaml` dentro do gerador do `export-allowlist.json` | Só no script offline; **nunca** no bundle nem na EF. ⚠ Ver §Achado #2 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `toMatchInlineSnapshot` | `toMatchSnapshot` (arquivo `.snap`) | O `.snap` externo é o arquivo que o revisor não abre; o inline põe o diff no meio do PR. Vitest 4 falha nos dois casos em CI (não escreve snapshot em CI) [VERIFIED: Context7 / vitest docs/guide/snapshot.md] |
| `toMatchInlineSnapshot` | Asserção de igualdade explícita (`expect(keys).toEqual([...])`) | Funciona e não estreia técnica nova. **Perde** a ergonomia do `-u`; ganha legibilidade. Aceitável se o planner preferir não introduzir snapshot no repo — mas o EXPORT-04 diz literalmente "snapshot test" |
| Client mintar o signed URL | EF nova/ação nova com `service_role` | A EF é **mais** superfície (service_role no caminho do CV) para resolver algo que a RLS own-folder já autoriza. Ver OQ-1 |
| Smoke SQL manual (MCP) | Script node que conecta ao Postgres no CI | Exigiria credencial de PROD no CI — trocaria um guarda por um vazamento. Rejeitado |
| Gerar o HTML com biblioteca | String-building hand-rolled | Idioma já vivo em `_shared/email-templates.ts` e `gerarIcsAgendamento`; zero dep nova (invariante M8) |

**Installation:**

```bash
# NENHUMA instalação de runtime. A única mudança de package.json em discussão é
# promover js-yaml de transitiva a devDependency explícita — ver §Achado #2.
npm install --save-dev js-yaml@^3.14.2   # OPCIONAL — decisão do planner, ver Achado #2
```

**Version verification (medida em 2026-08-03):**

```bash
node --version                          # v24.18.0
npx supabase --version                  # 2.111.0
deno --version                          # deno 2.9.4 (aarch64-apple-darwin)
node -e "require('js-yaml/package.json')" # 3.14.2 (transitiva, hoisted)
```

## Package Legitimacy Audit

Esta fase **não instala nenhum pacote externo novo**. A única promoção em discussão é de um pacote
já presente na árvore.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `js-yaml` | npm | >10 anos | dezenas de milhões/semana | github.com/nodeca/js-yaml | **[OK]** | **Já instalado (3.14.2, transitivo)**. Promoção a devDependency é decisão do planner, não instalação nova |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

> ⚠ **Nota de proveniência honesta.** Não executei `gsd-tools query package-legitimacy check` nem
> `npm view js-yaml` nesta sessão — verifiquei a **presença local** do pacote e sua versão lendo
> `node_modules/js-yaml/package.json` e seu `README.md`. Como não há instalação nova, o portão de
> legitimidade não tem alvo. Se o planner decidir promover `js-yaml` a devDependency explícita, rode
> `npm view js-yaml version` antes de pinar — não porque haja dúvida sobre o pacote, mas porque o
> ritual é o que mantém o portão vivo.

---

## Achados que mudam o plano

Estes quatro são o núcleo desta pesquisa. Cada um contradiz ou refina uma premissa do CONTEXT/UI-SPEC.

### Achado #1 (ALTO) — `CvButton` e `get-curriculo-url` **não** servem ao candidato

A `44-UI-SPEC` §Component Inventory lista `CvButton` como "molde de mecanismo … reusado verbatim".
O **mecanismo** (abrir a aba dentro do gesto, `win.opener = null`, navegar depois do await) é de
fato reusável e correto. A **fonte de dados não é.**

Medido em 2026-08-03:

- `CvButton` chama `getSignedUrl(candidaturaId)` de `@/features/vagas/services/cvUploadService`
  [VERIFIED: src/features/hub-candidato/components/CvButton.tsx:23].
- `getSignedUrl` invoca a EF `get-curriculo-url`
  [VERIFIED: src/features/vagas/services/cvUploadService.ts:61-63,180].
- A EF, no passo 2, lê `usuarios_rh.role` e devolve `403` se o papel não for `rh`/`administrador`.
  Verbatim: `if (role !== "rh" && role !== "administrador") { return errorResponse("FORBIDDEN",
  "Acesso negado.", 403); }` [VERIFIED: supabase/functions/get-curriculo-url/index.ts:139-141].
- O único sítio de uso vivo é uma tela de RH
  [VERIFIED: src/features/hub-candidato/components/HubCandidatoRH.tsx:47,305].

**Portanto: um candidato que clicasse em "Abrir meu currículo" reusando `CvButton` verbatim receberia
403.** O plano precisa de um caminho próprio. Os dois candidatos estão em §OQ-1; a recomendação é o
caminho client-side, e ela se apoia em dois fatos medidos:

1. A policy own-folder está viva no arquivo de migration da Phase 32, verbatim:
   ```sql
   CREATE POLICY "curriculos_select_own_or_rh"
   ON storage.objects
   FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'curriculos'
     AND (storage.foldername(name))[1] = (select auth.uid()::text)
   );
   ```
   [VERIFIED: supabase/migrations/20260715000001_curriculos_drop_rh_read.sql:34-41]
2. `createSignedUrl` exige exatamente `SELECT` em `storage.objects`, e o servidor de Storage consulta
   a linha e aplica RLS **antes** de emitir a URL [VERIFIED: Context7 — supabase/apps/studio
   `Storage.constants.ts`, `createSignedUrl: ['SELECT']`].

E `candidaturas.curriculo_url` é legível pelo próprio candidato via a policy own-row viva:
`CREATE POLICY candidato_le_propria_candidatura ON public.candidaturas FOR SELECT USING (candidato_id
IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid())))`
[VERIFIED: supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:38-42].

⚠ **Duas medições que o planner DEVE fazer contra o vivo antes de travar isso** (§Live-Catalogue
Measurement Protocol, consultas M4 e M5): (a) as policies de `storage.objects` no bucket `curriculos`
existem hoje como o arquivo diz? (drift é fato recorrente); (b) todo `curriculo_url` não-nulo começa
com o `user_id` do dono? Se houver um caminho legado com outro prefixo, a policy own-folder não o
cobre e o candidato receberia um erro silencioso.

### Achado #2 (MÉDIO) — `js-yaml` é dependência **fantasma** do pipeline de compliance

`docs/compliance/sql/gen-pii-md.cjs:22` faz `const yaml = require('js-yaml')`, e `js-yaml` **não
aparece** em `package.json` — nem em `dependencies` nem em `devDependencies`
[VERIFIED: package.json integral lido em 2026-08-03; `grep -n "js-yaml" package.json` → 0 linhas].
Ele está em `node_modules` na versão **3.14.2**, hoisted como transitiva de `dom-accessibility-api`
(← `@testing-library/dom` ← `@testing-library/react`).

**Consequência:** um bump futuro de `@testing-library/*` que solte `js-yaml` quebra silenciosamente
tanto o `gen-pii-md.cjs` quanto o gerador novo desta fase — e quebra o `--check` **junto**, então o
guarda morre com o gerador. Três saídas:

| Opção | O que muda | Custo |
|---|---|---|
| (a) aceitar como está | nada | herda o risco que a P42 herdou; o `--check` do CI não avisa, ele explode |
| **(b) promover a `devDependency` explícita** ✅ recomendado | +1 linha em `package.json` | é o pacote **já instalado**; não é "dependência npm nova" no sentido do invariante M8 (que trata de bundle/runtime), mas é mudança de `package.json` e merece ser nomeada no plano |
| (c) trocar o YAML por JSON como fonte | reescreve o `pii-inventory.yaml` | contraria D-P42-17 (formato duplo travado) — rejeitado |

**Hardening adicional (barato):** em js-yaml **3.x**, `yaml.load` usa `DEFAULT_FULL_SCHEMA`, que
suporta tipos JavaScript (`!!js/function`); `yaml.safeLoad` usa `DEFAULT_SAFE_SCHEMA`
[VERIFIED: node_modules/js-yaml/README.md:96-133 — "Use with care with untrusted sources. The same as
`safeLoad()` but uses `DEFAULT_FULL_SCHEMA` by default"]. O `gen-pii-md.cjs` usa `yaml.load`
[VERIFIED: docs/compliance/sql/gen-pii-md.cjs:110]. O input é um arquivo do próprio repositório, então
o risco prático é nulo — mas o **gerador novo desta fase deve usar `safeLoad`**, porque custa uma
palavra e porque um script de compliance que carrega YAML com schema full é exatamente o detalhe que
uma auditoria futura marca.

### Achado #3 (ALTO) — o vocabulário do YAML classifica para a Phase 45, **não** para a 44

O `pii-inventory.yaml` traz quatro classificações, verbatim
[VERIFIED: docs/compliance/pii-inventory.yaml:32-46]:

```yaml
classificacoes:
  apagar: |
    Dado pessoal sem função probatória. …
  anonimizar: |
    Dado pessoal cuja LINHA precisa sobreviver …, mas cujo CONTEÚDO identificante
    deve ser destruído in-place (tombstone). Art. 12 caput + Art. 16, IV.
  preservar: |
    Não é dado pessoal, OU é dado cuja preservação é exigida por obrigação
    legal/probatória (Art. 7º, II e Art. 16, I). Sobrevive intacto.
  preservar_com_ressalva: |
    Estruturalmente não-PII, mas pode CARREGAR PII digitada por humano ou
    embutida por IA em campo livre/JSONB. …
```

Esses rótulos respondem **"o que a exclusão faz com esta coluna"**. A pergunta da Phase 44 é outra:
**"esta coluna é dado do titular, no sentido do Art. 18, II?"**. Os eixos não coincidem, e três
famílias provam:

- `autorizacoes.autorizacao_uso_dados` é `preservar` (prova de base legal) — **e ainda assim é dado
  do titular** e a Área 2 manda incluí-lo.
- `configuracoes_empresa.smtp_senha_encrypted` é `preservar` — e é **segredo**, jamais exportável
  (achado A-05 do próprio YAML: *"A allowlist do export (EXPORT-02) tem de ser construída por
  inclusão explícita — um select('*') aqui vaza credencial, não só PII"*)
  [VERIFIED: docs/compliance/pii-inventory.yaml:508-517].
- `usuarios_rh.*` é PII **de funcionário**, e o YAML já diz que está *"Fora do escopo do direito do
  titular candidato"* [VERIFIED: docs/compliance/pii-inventory.yaml:404-409].

**Portanto o gerador não pode mapear classificação→exportável.** Ele precisa de uma **camada de
decisão explícita** commitada junto: um arquivo de regras que nomeia tabela a tabela o escopo do
titular. §Architecture Patterns P2 propõe a forma concreta.

### Achado #4 (MÉDIO) — a fila do RH herda um escopo que **não tem análogo** aqui

`listar_revisoes_decisao` reimplementa dentro do `SECURITY DEFINER` o escopo por vaga, verbatim
[VERIFIED: supabase/migrations/20260730000001_p42_revisao_art20.sql:351-357]:

```sql
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND c.deleted_at IS NULL
              AND c.is_rascunho = false
              AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
         )
```

Um **pedido de dados não tem vaga.** Ele pertence ao candidato, não a uma candidatura. Logo o
predicado acima **não tem tradução direta**, e o planner tem de escolher — a escolha é de política,
não de engenharia, e está em §OQ-2. Registrada aqui porque a UI-SPEC declara a rota
`RoleGuard role={['rh','administrador']}` e o item de menu "não role-gated", mas **não** diz o escopo
de **dados**, e este projeto tem precedente duro de que o `RoleGuard` não é o portão real
(comentário vivo em `routes.tsx:456-459`).

---

## Live-Catalogue Measurement Protocol

> ⚠ **Esta seção é a mais importante da pesquisa para quem for planejar, e ela declara uma lacuna
> honesta: eu NÃO consegui medir o catálogo vivo nesta sessão.**

**Por quê:** subagentes GSD não recebem os tools MCP do Supabase (bug upstream
anthropics/claude-code#13898) — fato já registrado no cabeçalho de
`docs/compliance/sql/01-pii-catalog.sql:24-27` e de `04-invent05-blast-radius.sql:13-16`, e
reconfirmado nesta sessão: minha lista de ferramentas não contém `mcp__supabase__*`. **Toda contagem
de coluna citada nesta pesquisa vem do YAML de 2026-07-29, não de uma medição de hoje.**

**Consequência para o plano:** a Wave 0 do plano tem de conter uma tarefa de **medição pelo
orquestrador** cujo output é colado no plano/VERIFICATION antes de a allowlist ser travada. Um
`export-allowlist.json` derivado só do YAML herda 5 dias (ou mais) de drift potencial — e a Phase 43
já adicionou colunas de consentimento versionado que **entram** no escopo (dependência declarada no
ROADMAP:150).

### As cinco medições (READ-ONLY, seguras em PROD)

Todas via `execute_sql` do MCP contra o projeto `isljnozzlvckrgjjbjwp`, pelo **orquestrador**.

| # | Mede | Consulta |
|---|------|----------|
| **M1** | Totais de escopo hoje vs. os 64/993/102 do YAML | reusar a consulta **(d)** de `docs/compliance/sql/01-pii-catalog.sql` **sem alterar uma vírgula** |
| **M2** | Catálogo coluna-a-coluna das tabelas do escopo do export | reusar a consulta **(a)** de `01-pii-catalog.sql`, filtrada por `c.table_name = ANY($tabelas_do_escopo)` |
| **M3** | Policies vivas das duas tabelas novas *(pós-apply)* | `SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename IN ('solicitacoes_dados','config_sla_dados');` |
| **M4** | Policies vivas do bucket `curriculos` (**fecha o Achado #1**) | `SELECT policyname, cmd, roles, qual FROM pg_policies WHERE schemaname='storage' AND tablename='objects';` |
| **M5** | Prefixo dos caminhos de CV — a premissa `{auth.uid()}/…` (**fecha o Achado #1**) | `SELECT count(*) AS total, count(*) FILTER (WHERE split_part(c.curriculo_url,'/',1) = ca.user_id::text) AS com_prefixo_do_dono FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id WHERE c.curriculo_url IS NOT NULL;` |

**Regra de honestidade de número** (herdada de `04-invent05-blast-radius.sql:30-40`): nenhum número
citado no plano pode vir de um documento datado. O número que autoriza a decisão é o que foi medido
minutos antes dela. Todo número no `export-allowlist.json` carrega `medido_em`.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─ OFFLINE / BUILD ────────────────────────────────────────────────────────────┐
│                                                                              │
│  docs/compliance/pii-inventory.yaml   docs/compliance/export-scope-rules.*   │
│   (semente de CLASSIFICAÇÃO, P42)      (decisão: o que é dado do TITULAR)    │
│              │                                    │                          │
│              └──────────────┬─────────────────────┘                          │
│                             ▼                                                │
│              gen-export-allowlist.cjs   ◀── [M2] catálogo VIVO (orquestrador)│
│                    │              │                                          │
│         escreve ───┘              └─── --check (exit 1 se divergir)          │
│                    ▼                                                         │
│      docs/compliance/export-allowlist.json  ── meta.versao · meta.medido_em  │
│                    │                          meta.consumidores: [Phase 45]  │
│        ┌───────────┴────────────┬──────────────────────┐                     │
│        ▼                        ▼                      ▼                     │
│  import estático          Vitest inline           smoke SQL (M2 ⋈ allowlist) │
│  na EF (sem YAML)         snapshot (CI)           FULL OUTER JOIN, 2 sentidos│
└──────────────────────────────────────────────────────────────────────────────┘

┌─ RUNTIME · CANDIDATO ────────────────────────────────────────────────────────┐
│                                                                              │
│  /candidato/privacidade §3                                                   │
│   ├─ [carga] useUltimoPedidoDados ──own-row──▶ solicitacoes_dados (RLS)      │
│   │            └─ falha ⇒ NÃO derruba o bloco; servidor vira a autoridade    │
│   │                                                                          │
│   ├─ [clique CTA] useExportarMeusDados                                       │
│   │    └─▶ functions.invoke('exportar-meus-dados')  [JWT-ON]                  │
│   │          ├─1 AUTHENTICATE  supabaseUser.auth.getUser()      → 401         │
│   │          ├─2 RESOLVE       candidatos.select('id') by user_id → 403/404   │
│   │          ├─3 COOLDOWN      último pedido < 24h?              → 429        │
│   │          ├─4 REGISTRA      INSERT solicitacoes_dados (pendente)           │
│   │          ├─5 PROJETA       N reads, cada uma por ALLOWLIST                │
│   │          │                 (nunca select('*'); ai_call_logs FORA)         │
│   │          ├─6 MARCA         UPDATE → atendido | pendente+causa             │
│   │          └─7 RESPONDE      { ok, payload, curriculos[{nome,enviado_em}] } │
│   │                            ⚠ NENHUM signed URL no payload                 │
│   │    └─▶ gerarJson(payload) ─┐                                             │
│   │        gerarHtml(payload) ─┴─▶ Blob → <a download> → .json PRIMEIRO      │
│   │                                                                          │
│   └─ [clique "Abrir meu currículo"] (por linha)                              │
│        └─▶ window.open('about:blank') DENTRO do gesto → opener=null           │
│            └─▶ storage.from('curriculos').createSignedUrl(path, 60)          │
│                 ▲ client anon + JWT do candidato                             │
│                 └── autorizado por RLS own-folder em storage.objects         │
│                     (service_role NUNCA toca o CV do titular)                │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ RUNTIME · RH (supervisão, zero ação) ───────────────────────────────────────┐
│  /rh/pedidos-dados ─▶ RPC listar_pedidos_dados (SECURITY DEFINER)            │
│                       guard de papel + ESCOPO EXPLÍCITO (OQ-2) + tipo='acesso'│
│                       ORDER BY: pendentes primeiro (ASC) → atendidos (DESC)   │
│                       LIMIT 200 · aviso de corte fora da tabela              │
│  RHSidebar badge ──▶ RPC contar_pedidos_dados_pendentes (MESMO escopo)       │
│  faixa ────────────▶ config_sla_dados (RH-only) → classifySlaDados (=alias)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
docs/compliance/
├── export-allowlist.json          # ARTEFATO DO SC#5 — commitado, versionado
├── export-scope-rules.yaml        # a decisão "é dado do titular?" (Achado #3)
└── sql/
    ├── gen-export-allowlist.cjs   # gerador + --check (molde: gen-pii-md.cjs)
    └── 05-export-allowlist-drift.sql   # smoke SQL do SC#3, asserção (2)

supabase/functions/exportar-meus-dados/
├── index.ts                       # handler exportável + Deno.serve (molde: get-curriculo-url)
└── __tests__/index.test.ts        # Deno test (excluir do Vitest em vite.config.ts)

supabase/migrations/
├── 20260804000001_p44_solicitacoes_dados.sql
└── 20260804000002_p44_config_sla_dados.sql   # ou fundida — ver §G

src/features/privacidade/          # EDITADO (candidato)
├── components/PedirCopiaBloco.tsx
├── components/CurriculosBloco.tsx
├── hooks/useExportarMeusDados.ts
├── hooks/useUltimoPedidoDados.ts
└── services/exportacaoService.ts  # invoke + geradores PUROS + disparo do download

src/features/pedidos-dados/        # NOVO (RH)
├── components/{PedidosDadosRHPage,FilaPedidosDadosTable,SituacaoPedidoBadge}.tsx
├── hooks/{useFilaPedidosDados,useConfigSlaDados,usePedidosDadosPendentesCount}.ts
├── services/pedidosDadosService.ts
└── constants/slaDados.ts          # ALIASES — zero cópia de lógica
```

---

### Pattern 1 — O bloco novo entra na página existente sem tocar as seções 1 e 2

**What:** a `PrivacidadeCandidatoPage` já tem duas `<section>`; a terceira replica o separador.
**When to use:** EXPORT-01/03/06, superfície do candidato.
**Evidência viva** [VERIFIED: src/features/privacidade/components/PrivacidadeCandidatoPage.tsx:185,200]:
a seção 1 é `<section className="space-y-4">` e a seção 2 é
`<section className="space-y-4 border-t border-white/15 pt-6">`. A seção 3 usa **a mesma classe da
seção 2** — o valor não é inventado, é copiado. `COPY_PRIVACIDADE` é o objeto de copy da página
(`:34`) e recebe as chaves novas ali, não num módulo paralelo.

### Pattern 2 — Allowlist derivada em DUAS entradas, nunca uma

**What:** o gerador consome **duas** fontes e falha se elas discordarem.
**Why:** o Achado #3 — o YAML classifica para a exclusão, não para o acesso.

```
  pii-inventory.yaml          export-scope-rules.yaml           [M2] catálogo vivo
  (existe: classificação)     (novo: escopo do titular)         (medido no dia)
          │                           │                                │
          └──────────► gen-export-allowlist.cjs ◄─────────────────────┘
                                │
             falha se: tabela em scope-rules ausente do catálogo
                       coluna do catálogo em tabela de escopo sem veredito
                       qualquer coluna marcada `segredo` entrando por engano
```

Forma proposta de `export-scope-rules.yaml` (discricionária, mas a **estrutura** é o que importa):

```yaml
meta:
  requirement: EXPORT-02
  fase: 44
  fonte: |
    Decisão de ESCOPO DO TITULAR — ortogonal à classificação de exclusão do
    pii-inventory.yaml (que responde "o que a exclusão faz", não "isto é dado
    do titular sob o Art. 18, II"). Ver 44-RESEARCH §Achado #3.

# Regra de fecho: uma tabela que não aparece em NENHUMA das três listas é ERRO
# do gerador, nunca omissão silenciosa. É o mesmo princípio de cobertura
# auditável que regras_padrao R1–R5 dão ao pii-inventory.yaml.
escopo_titular:            # entram no export
  - candidatos
  - candidaturas
  - autorizacoes
  - agendamentos_entrevista
  - historico_candidatura
  # … as tabelas de avaliação/resposta nomeadas na Área 2 do CONTEXT
fora_do_escopo:            # razão NOMEADA, nunca "não lembrei"
  ai_call_logs:            telemetria_interna        # Área 2 + Deferred
  usuarios_rh:             pii_de_terceiro           # YAML:404-409
  configuracoes_empresa:   segredo                   # YAML achado A-05
  webhooks_config:         segredo                   # YAML achado A-05
colunas_nunca:             # veto que atravessa qualquer tabela
  - smtp_senha_encrypted
  - webhook_secret
  - secret
  - session_token
  - hash_cpf_email
```

E a saída, `docs/compliance/export-allowlist.json` — o artefato do SC#5:

```jsonc
{
  "meta": {
    "requirement": "EXPORT-02",
    "fase": 44,
    "versao": "1.0.0",
    "medido_em": "2026-08-04T00:00:00Z",
    "fonte_classificacao": "docs/compliance/pii-inventory.yaml",
    "fonte_escopo": "docs/compliance/export-scope-rules.yaml",
    "catalogo_vivo": "docs/compliance/sql/01-pii-catalog.sql (consulta (a)/(d))",
    "consumidores": [
      "Phase 44 — projeção da EF exportar-meus-dados (EXPORT-02)",
      "Phase 45 — plano de exclusão/anonimização (ERASE-02, ERASE-06)"
    ]
  },
  "tabelas": {
    "candidatos":   { "colunas": ["id", "nome_completo", "email", "…"] },
    "candidaturas": { "colunas": ["id", "vaga_id", "…"] }
  },
  "excluidas": { "ai_call_logs": "telemetria_interna" }
}
```

⚠ **`meta.versao` + `meta.consumidores` não são adorno** — são o SC#5 em forma executável. A Phase 45
tem de conseguir dizer "consumi a versão X" em vez de refazer o levantamento.

### Pattern 3 — A EF: clone estrutural, com **três** desvios nomeados

**What:** `exportar-meus-dados` segue `get-curriculo-url` passo a passo, mas não é cópia cega.
**Os três desvios (e por que cada um existe):**

| # | `get-curriculo-url` | `exportar-meus-dados` | Razão |
|---|---|---|---|
| 1 | passo 2 = `usuarios_rh.role ∈ {rh,administrador}` | passo 2 = resolver `candidatos.id` **de `auth.uid()`** e recusar quem não for candidato | o titular é o autorizado; RH não usa este endpoint (Área 3) |
| 2 | entrada `{ candidatura_id }` | **entrada vazia** (`POST` sem corpo significativo) | não há id a receber; qualquer id no corpo é a superfície T-32-03 que a Área 3 fecha. Um corpo que não é lido é um corpo que não pode ser forjado |
| 3 | uma leitura (`candidaturas`) | **N leituras, uma por tabela da allowlist**, mais o `INSERT`/`UPDATE` do registro | o payload é composto; o registro é o cooldown |

**Contrato de erro (reusar o vocabulário vivo + um valor novo):**
`type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR"`
[VERIFIED: supabase/functions/get-curriculo-url/index.ts:59] **+ `"COOLDOWN"` (HTTP 429)** — valor
novo porque o cooldown não é nenhum dos cinco: não é falta de sessão, não é falta de permissão, não é
input inválido. Traduzir cooldown para 403 faria a UI ter de adivinhar qual 403 é qual.

### Pattern 4 — `solicitacoes_dados` (DDL discricionária; as invariantes não são)

O molde é `config_sla_revisao` no que toca RLS e comentários. As invariantes que o plano não pode
relaxar:

- `tipo text NOT NULL CHECK (tipo IN ('acesso','exclusao')) DEFAULT 'acesso'` — nasce genérica
  (Área 4). O CHECK fecha o vocabulário **no banco**; o cliente ainda normaliza defensivamente
  (precedente 42-11, reafirmado na UI-SPEC §Badge de Situação).
- `situacao text NOT NULL CHECK (situacao IN ('atendido','pendente'))` — o vocabulário fechado que a
  UI-SPEC §Coluna "O que aconteceu" já enumera.
- `causa text NULL CHECK (causa IS NULL OR causa IN ('falha_geracao','curriculo_ausente','permissao'))`
  — os três tokens vêm verbatim da UI-SPEC §Coluna "O que aconteceu"; o cliente traduz, com fallback
  total ("Motivo não registrado").
- `candidato_id uuid NOT NULL REFERENCES public.candidatos(id)` — **`ON DELETE` é decisão da Phase
  45**, não desta. Anotar no comentário da migration em vez de escolher agora: a P45 é quem sabe se o
  pedido de acesso sobrevive ao tombstone.
- `solicitado_em timestamptz NOT NULL DEFAULT now()` — é o marco do Art. 19, II. **É `solicitado_em`
  que o cooldown lê e é dele que o SC#4 conta.**
- **Índice do cooldown:** `CREATE INDEX ... ON public.solicitacoes_dados (candidato_id, solicitado_em
  DESC);` — a leitura do cooldown roda em todo carregamento da seção 3.
- **RLS:** SELECT own-row para o candidato (espelhando o predicado vivo de
  `candidato_le_propria_candidatura`); **nenhuma policy de INSERT para o candidato** — a escrita é da
  EF com `service_role`, que bypassa RLS. Motivo: se o candidato pudesse inserir, ele poderia
  *não* inserir (e furar o cooldown) ou inserir com `situacao='atendido'` sem que nada tenha sido
  entregue. O registro é afirmação do servidor sobre um fato do servidor.
- **Leitura do RH:** via a RPC `SECURITY DEFINER` (o nome do candidato vive em `candidatos`, e o
  escopo da OQ-2 é predicado explícito) — mesma arquitetura de `listar_revisoes_decisao`.

### Pattern 5 — `config_sla_dados`: espelho **estrutural** de `config_sla_revisao`

Molde verbatim [VERIFIED: supabase/migrations/20260730000001_p42_revisao_art20.sql:442-458]:

```sql
CREATE TABLE public.config_sla_revisao (
  chave         text        PRIMARY KEY,
  dias_atencao  integer     NOT NULL CHECK (dias_atencao > 0),
  dias_atraso   integer     NOT NULL CHECK (dias_atraso > 0),
  descricao     text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_config_sla_revisao_ordem CHECK (dias_atraso > dias_atencao)
);

ALTER TABLE public.config_sla_revisao ENABLE ROW LEVEL SECURITY;

CREATE POLICY config_sla_revisao_rh_read ON public.config_sla_revisao
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
```

**Três coisas para copiar e uma para NÃO copiar:**

✅ o CHECK de ordem (`dias_atraso > dias_atencao`) — é a razão de `classifyRevisaoSla` poder confiar
na ordem, e o `degenerado` existe porque o CHECK pode ser burlado por `UPDATE` mal feito.
✅ RLS RH-only com **uma única** policy de SELECT e **nenhuma** de escrita (default-deny) — "alterar
o limiar é operação de banco, não de aplicação, e é justamente isso que o torna alterável SEM
DEPLOY" [VERIFIED: mesmo arquivo:453-455].
✅ o seed com `ON CONFLICT DO NOTHING`, **jamais upsert** — re-seedar sobrescreveria um número que o
operador ajustou [VERIFIED: mesmo arquivo:495-497 e comentário :488-490].
❌ **NÃO copiar a RLS de `config_sla_etapa`**, que é public-read por design do painel do candidato —
o próprio comentário da P42 grita isso [VERIFIED: mesmo arquivo:437-441]. E a Invariante 8 da
44-UI-SPEC repete: nenhum valor de acompanhamento vaza para o candidato, e a invariante não pode
depender de a tela não renderizar.

**Sobre o seed e os 15 dias.** O Art. 19, II é **teto**, não limiar. Seed sugerido: `dias_atencao=7`,
`dias_atraso=12` — ambos **abaixo** de 15, para que a faixa vermelha apareça com folga para agir. O
número exato é discricionário; o **invariante** é `dias_atraso < 15`, e vale escrevê-lo no comentário
da coluna. ⚠ Um `CHECK (dias_atraso < 15)` no banco seria tentador e é **errado**: a ANPD pode dispor
prazos diferenciados por setor (Art. 19 §4º), e um CHECK travaria uma alteração legítima numa tabela
cuja razão de existir é ser alterável sem deploy.

### Pattern 6 — Rota e sidebar: três sítios, um commit

Idioma vivo, medido [VERIFIED: src/components/RHSidebar.tsx:97 (`getActivePageFromPath`), :127-132
(`MenuItem`), :176 (mapa `routes`)] — cada sítio tem um modo de falha silencioso próprio documentado
no arquivo: *"sem esta linha o item navega mas nunca se acende"* / *"sem esta entrada o item existe,
se acende, e não navega"*. A rota segue o idioma
`<RoleGuard role={['rh','administrador']}><PedidosDadosRHPage /></RoleGuard>`
[VERIFIED: src/router/routes.tsx:460-467], carregada por `lazyNamed`
[VERIFIED: src/router/routes.tsx:39,53-55].

### Anti-Patterns to Avoid

- **`select('*')` em qualquer leitura desta fase.** 58 ocorrências vivas medidas em `src/` +
  `supabase/functions/` (2026-08-03). RLS é row-level e não esconde coluna.
- **Parsear YAML dentro da EF.** Decisão travada da Área 2. O artefato é JSON, importado
  estaticamente.
- **Import de `esm.sh` construído em runtime** (`["npm:",pkg].join("")`) — `ERR_MODULE_NOT_FOUND` em
  P10-13.
- **Wrapper `BEGIN;`/`COMMIT;` nas migrations** — gatilho documentado do 42601.
- **Duplicar `classifyRevisaoSla`.** A UI-SPEC pede asserção de **identidade de referência**
  (`classifySlaDados === classifyRevisaoSla`) precisamente porque cópia-e-cola é o desfecho provável.
- **`toast` para o sucesso do export.** O sucesso nomeia dois arquivos que a pessoa vai procurar; um
  toast some antes disso (UI-SPEC §Primitivos).
- **Signed URL em qualquer lugar que persista** — payload, `.json`, `.html`, estado de componente,
  cache de query, `console.*`.
- **Coluna `Tipo` na fila** — mas **o filtro `tipo='acesso'` é obrigatório no servidor**, senão as
  linhas de exclusão da P45 entram nesta tela em silêncio (UI-SPEC §O que esta fase NÃO faz).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Classificar faixa de SLA | um `classifySlaDados` novo | `classifyRevisaoSla` importado e re-exportado por alias | função total com faixa `degenerado`; duplicar cria um 2º lugar onde o invariante apodrece (P39/CR-02) |
| Contador do menu | um formatador novo | `formatarBadgePendentes` de `revisaoService` | carrega a decisão do `undefined` para 0; reescrever reintroduz o `0` solto (`'0 && …'` renderiza `0`) |
| Badge de faixa | um badge novo | `RevisaoSlaBadge` verbatim (só emendar o docblock) | zero ganho comportamental em renomear; o docblock hoje mente ao dizer "importado exclusivamente pela fila do RH [de revisões]" |
| Loading/error/empty da fila | branches manuais | `AsyncState` com `copy={{...}}` | precedência travada `isLoading → slow → isError → isEmpty → children` |
| Download de arquivo | biblioteca de download | `Blob` → `createObjectURL` → `<a download>` → `revokeObjectURL` | idioma vivo, medido [VERIFIED: src/features/agendamento/services/agendamentoCandidatoService.ts:205-217] |
| Abrir aba com URL assíncrona | `window.open` depois do `await` | `window.open('about:blank')` **dentro** do gesto + `opener=null` + navegar depois | perder a ativação transitória é popup-block garantido no Safari (CvButton:41-48) |
| Signed URL | construir URL de Storage à mão | `storage.from(bucket).createSignedUrl(path, 60)` | o servidor consulta a linha e aplica RLS antes de emitir |
| Sincronizar doc gerado com a fonte | revisão manual | modo `--check` que sai 1 na divergência | idioma vivo [VERIFIED: docs/compliance/sql/gen-pii-md.cjs:113-122] |
| PDF / ZIP para os dois arquivos | `jspdf` (já existe!) ou lib de zip | HTML autocontido + dois downloads no mesmo gesto | UI-SPEC §Registry Safety rejeita explicitamente; e o `.json` primeiro garante que o artefato legal sobrevive se o 2º download for barrado |

**Key insight:** esta fase inteira é um exercício de **não escrever código novo onde há código vivo**.
As três reutilizações que a UI-SPEC nomeia (`classifyRevisaoSla`, `RevisaoSlaBadge`,
`formatarBadgePendentes`) foram verificadas contra o código vivo nesta pesquisa e **todas as três são
reusáveis como estão** — sem mudança de assinatura, sem adaptação. A única "reutilização" declarada
que **não** sobrevive à verificação é o `CvButton` (Achado #1), e mesmo lá o *mecanismo* se reusa; só
a *fonte de dados* não.

### Verificação das três reutilizações (contra o código vivo, 2026-08-03)

| Reuso | Assinatura viva | Reusável como está? |
|---|---|---|
| `classifyRevisaoSla(dias: number, cfg?: LimiaresSlaRevisao \| null): FaixaSlaRevisao` | [VERIFIED: src/features/revisao/constants/slaRevisao.ts:118-121] | ✅ **Sim.** Agnóstico ao prazo — recebe os limiares por parâmetro, não os lê. `LimiaresSlaRevisao = { diasAtencao, diasAtraso }` (`:43-48`) casa 1:1 com `config_sla_dados` |
| `RevisaoSlaBadge({ diasEspera, limiares })` | [VERIFIED: src/features/revisao/components/RevisaoSlaBadge.tsx:43-48] | ✅ **Sim.** Props são `number` + `LimiaresSlaRevisao \| null`; nenhuma dependência do domínio de revisão. Única ação obrigatória: emendar o docblock (`:26-28`) |
| `formatarBadgePendentes(n: number \| null \| undefined): string \| undefined` | [VERIFIED: src/features/revisao/services/revisaoService.ts:180-188] | ✅ **Sim.** Puro, sem dependência de domínio. ⚠ Devolve **`undefined`** para 0/null/não-finito — não `''` como a UI-SPEC §Contador do menu escreve. Diferença de redação, não de comportamento (`badge={undefined}` = sem badge), mas o plano deve usar `undefined` |
| `diasEmEspera(desdeIso, now?)` | [VERIFIED: src/features/revisao/constants/slaRevisao.ts:100-106] | ✅ **Sim.** Clampa negativos em `0`, data inválida → `0`, nunca `NaN` |

---

## Common Pitfalls

### Pitfall 1 — A allowlist derivada de arquivos de migration omite colunas reais
**What goes wrong:** o gerador lê `supabase/migrations/`, produz uma allowlist "completa", e o export
entrega uma cópia incompleta ao titular — silenciosamente.
**Why:** o DDL base de ~40 tabelas legadas vive fora do ledger, em `docs/sql/sql/*.sql` (49 scripts)
[VERIFIED: docs/compliance/pii-inventory.yaml:12-17], e o drift PROD→repo é recorrente (4 instâncias
registradas, a última na Phase 43: as 3 policies de `autorizacoes` vivem em PROD e em nenhum arquivo).
**How to avoid:** medição M2 pelo orquestrador **no dia**; `meta.medido_em` no artefato.
**Warning signs:** qualquer número no plano cuja proveniência seja um documento datado.

### Pitfall 2 — O guarda do SC#3 que não pode falhar pelo motivo declarado
**What goes wrong:** só a asserção Vitest é implementada; ela passa para sempre porque uma coluna
nova no banco não muda o JSON commitado.
**Why:** o Vitest lê o **artefato**, não o **catálogo**. São universos disjuntos.
**How to avoid:** as duas asserções, e a asserção (2) tem de ser **provada mordendo** — no idioma do
`assert-no-secrets.mjs`, que documenta a reprodução do próprio meta-teste
[VERIFIED: scripts/assert-no-secrets.mjs:33-45: *"META-TEST — proves this gate is real and not a
no-op"*]. Para o smoke SQL isso é barato: rodar contra uma tabela temporária com uma coluna a mais e
mostrar que ele falha, ou apontar uma tabela do escopo com uma coluna deliberadamente removida da
allowlist e mostrar o exit != 0.
**Warning signs:** um plano que diz "snapshot test" e não diz onde o smoke SQL mora e quem o roda.

### Pitfall 3 — Reusar `CvButton` verbatim e descobrir o 403 em produção
Ver §Achado #1. **Warning signs:** uma tarefa que diz "reusar `CvButton`" sem dizer qual serviço a
substitui.

### Pitfall 4 — O registro do pedido que só nasce quando tudo dá certo
**What goes wrong:** a EF monta o payload e **depois** insere a linha. Se a montagem falha, não há
linha — e a fila do RH, cujo valor inteiro está na falha (Área 4), fica vazia exatamente quando
importa. Pior: o cooldown não morde e o endpoint vira amplificador de exfiltração.
**How to avoid:** **INSERT primeiro, `situacao='pendente'`**; só depois monta; no fim, `UPDATE` para
`atendido` ou preenche `causa`. É a ordem que faz "um pedido que falhou é o único que consome prazo"
ser verdade.
**Warning signs:** um `INSERT` depois do `return` feliz no esboço da EF.

### Pitfall 5 — 42601 no apply das migrations
Ver §G. **Warning signs:** um plano que diz `supabase db push`.

### Pitfall 6 — O `.html` que confia no dado do titular
**What goes wrong:** o gerador interpola `nome_completo`, `observacoes_rh`, `resposta_texto` direto
na string do HTML. Um `<script>` digitado por qualquer pessoa que escreveu num campo livre vira
execução quando o titular abre o arquivo — **na origem `file://`**, que não tem CSP nenhuma.
**Why:** o payload do export é, por construção, **texto livre digitado por humanos** — inclusive por
terceiros (`observacoes_rh`, `motivo_rejeicao`).
**How to avoid:** função `escapeHtml` (`& < > " '`) aplicada a **todo** valor interpolado, e um teste
de unidade com um payload contendo `<script>` e `"><img onerror=`. O gerador é função pura → o teste
é trivial e sem DOM.
**Warning signs:** um template literal de HTML sem uma função de escape ao lado.

### Pitfall 7 — Signed URL que vaza para onde vive muito tempo
**What goes wrong:** a URL de 60 s entra no `.json`, no estado, no cache do React Query, ou num
`console.log`. Vira link morto que parece mentira do export, ou vira link vivo num arquivo.
**How to avoid:** Invariante 4 da UI-SPEC; o `CvButton` já implementa o padrão (só flags booleanas em
estado); a EF de CV já loga apenas `{ candidatura_id, role }` [VERIFIED:
supabase/functions/get-curriculo-url/index.ts:199].

### Pitfall 8 — O contador do menu que renderiza `0`
`'0 && …'` avalia para `0` e o React renderiza `0` como texto. Registrado no 42-10 e no docblock vivo
[VERIFIED: src/features/revisao/hooks/useRevisoesPendentesCount.ts:10-12]. Ternário, nunca `&&`.

### Pitfall 9 — A fila do RH que mente por omissão
O aviso de corte ("todos os não atendidos aparecem") só é honesto porque o `ORDER BY` põe os não
atendidos primeiro. Mudar a ordenação sem mudar a copy faz a tela mentir. O `LIMIT 200` server-side é
o precedente vivo [VERIFIED: supabase/migrations/20260730000001_p42_revisao_art20.sql:359].

### Pitfall 10 — `tsc --noEmit` tem baseline, e ela morde localmente antes do CI
O pre-commit congela **97** erros; o CI tolera **104** [VERIFIED: .husky/pre-commit:44-48 e
.github/workflows/ci.yml:63-67]. Código novo com erro de tipo **reprova o commit**, não o PR. Nada de
`--no-verify` (portão do milestone M8).

---

## Code Examples

### E1 — Esqueleto da EF (desvios do molde marcados)

```typescript
// supabase/functions/exportar-meus-dados/index.ts
// Molde: supabase/functions/get-curriculo-url/index.ts (D-23 two-client,
// authenticate-THEN-authorize, Deps injetável, esm.sh ESTÁTICO).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ⚠ IMPORT ESTÁTICO do artefato — nunca parse de YAML aqui (Área 2).
import allowlist from "../../../docs/compliance/export-allowlist.json" with { type: "json" };

type ErrorCode =
  | "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION"
  | "NOT_FOUND" | "SERVER_ERROR"
  | "COOLDOWN";            // ← DESVIO 3: 429, valor novo (Pattern 3)

export interface Deps { supabaseAdmin: any; supabaseUser: any }

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  const { supabaseAdmin, supabaseUser } = deps;

  // 1 · AUTHENTICATE — anon client + Authorization (D-23).
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  const user = userRes.user;

  // 2 · AUTHORIZE — DESVIO 1: o titular é quem autoriza. `candidato_id` NUNCA
  //     vem do corpo (T-32-03); é resolvido de auth.uid().
  const { data: cand, error: candErr } = await supabaseAdmin
    .from("candidatos").select("id").eq("user_id", user.id).maybeSingle();
  if (candErr) return errorResponse("SERVER_ERROR", "Falha ao verificar o titular.", 500);
  if (!cand)   return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  const candidatoId: string = cand.id;
  // DESVIO 2: nenhum corpo é lido. Um corpo que não é lido não pode ser forjado.

  // 3 · COOLDOWN — o servidor é a autoridade (Invariante 3 da UI-SPEC).
  const { data: ultimo } = await supabaseAdmin
    .from("solicitacoes_dados")
    .select("solicitado_em")
    .eq("candidato_id", candidatoId).eq("tipo", "acesso")
    .order("solicitado_em", { ascending: false }).limit(1).maybeSingle();
  if (ultimo && Date.now() - new Date(ultimo.solicitado_em).getTime() < 24 * 60 * 60 * 1000) {
    return jsonResponse(
      { ok: false, error_code: "COOLDOWN", liberado_em: /* +24h ISO */ "…" }, 429);
  }

  // 4 · REGISTRA ANTES de montar (Pitfall 4): a linha nasce `pendente`.
  const { data: pedido, error: insErr } = await supabaseAdmin
    .from("solicitacoes_dados")
    .insert({ candidato_id: candidatoId, tipo: "acesso", situacao: "pendente" })
    .select("id").single();
  if (insErr || !pedido) return errorResponse("SERVER_ERROR", "Falha ao registrar o pedido.", 500);

  try {
    // 5 · PROJETA por allowlist — NUNCA select('*')
    //     [[reference_select_star_leaks_pii]]
    const payload: Record<string, unknown> = {};
    for (const [tabela, def] of Object.entries(allowlist.tabelas)) {
      const { data, error } = await supabaseAdmin
        .from(tabela)
        .select((def as { colunas: string[] }).colunas.join(", "))
        .eq(chaveDoTitular(tabela), candidatoId);   // mapa explícito, nunca inferido
      if (error) throw new Error(`leitura de ${tabela}`);
      payload[tabela] = data ?? [];
    }

    // 6 · MARCA como atendido.
    await supabaseAdmin.from("solicitacoes_dados")
      .update({ situacao: "atendido", atendido_em: new Date().toISOString() })
      .eq("id", pedido.id);

    // 7 · RESPONDE. ⚠ NENHUM signed URL aqui (Invariante 4): só nome + data.
    return jsonResponse({ ok: true, versao_allowlist: allowlist.meta.versao, payload }, 200);
  } catch (e) {
    // Falha parcial: a linha FICA `pendente` com causa — é o que a fila do RH mostra.
    await supabaseAdmin.from("solicitacoes_dados")
      .update({ situacao: "pendente", causa: "falha_geracao" }).eq("id", pedido.id);
    console.error("[exportar-meus-dados] erro", { pedido_id: pedido.id });  // nunca o payload
    return errorResponse("SERVER_ERROR", "Falha ao preparar a cópia.", 500);
  }
}
```

⚠ **`chaveDoTitular(tabela)` é o ponto de atenção do esboço.** Nem toda tabela do escopo se liga ao
titular por `candidato_id` — `candidaturas` sim, mas `historico_candidatura` se liga por
`candidatura_id`, e `autorizacoes` tem **duas** colunas (`candidato_id` **e** `user_id`, ambas
`anonimizar` no YAML). O mapa tabela→chave é **dado do artefato**, não inferência do código: coloque-o
em `export-allowlist.json` (`"chave_titular": "candidato_id"` por tabela) para que o smoke SQL possa
verificá-lo também.

### E2 — Import estático de JSON no Deno

```typescript
// ✅ com attribute (Deno 2.x / ES2025)
import allowlist from "../../../docs/compliance/export-allowlist.json" with { type: "json" };
```

⚠ [ASSUMED] O caminho relativo saindo de `supabase/functions/` para `docs/` **pode não sobreviver ao
bundler do `supabase functions deploy`**, que empacota a partir do diretório da função. Duas saídas —
o plano deve escolher **e provar com um deploy**, não presumir:
(i) copiar o artefato para `supabase/functions/exportar-meus-dados/export-allowlist.json` num passo de
build, com o `--check` do gerador cobrindo as **duas** cópias; (ii) o gerador emitir também um
`_shared/exportAllowlist.ts` (`export const EXPORT_ALLOWLIST = {...} as const`), que é import de
TypeScript comum e não depende de resolução de JSON. **(ii) é o caminho mais seguro** e mantém uma só
fonte (o gerador). Verificar no deploy antes de fechar a tarefa.

### E3 — CV do titular: signed URL cunhado no clique, sem `service_role`

```typescript
// src/features/privacidade/services/exportacaoService.ts
import { supabase } from '@/lib/supabase/client'   // client ANON — C1 do CLAUDE.md

/**
 * Minta o signed URL do CV do PRÓPRIO titular. Autorizado pela policy own-folder
 * viva em storage.objects (20260715000001:34-41). `createSignedUrl` exige SELECT
 * naquela tabela [Context7 / Storage.constants.ts], então a RLS é o portão —
 * e nenhum service_role toca o CV do titular.
 * ⚠ A URL NUNCA é guardada: nem em estado, nem em cache, nem em console.
 */
export async function mintarUrlCurriculoProprio(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('curriculos')
    .createSignedUrl(path, 60)            // 60 s — o TTL canônico do projeto
  if (error || !data?.signedUrl) {
    throw new ExportacaoError('Não foi possível abrir este currículo.', 'STORAGE_ERROR')
  }
  return data.signedUrl
}
```

Consumido pelo **mecanismo** do `CvButton` (abrir a aba dentro do gesto → `opener = null` → navegar
depois do await) [VERIFIED: src/features/hub-candidato/components/CvButton.tsx:41-58]. A lista de
`{ candidatura_id, vaga_titulo, curriculo_nome_original, curriculo_url, created_at }` vem da leitura
own-row por allowlist (policy `candidato_le_propria_candidatura`, viva).

### E4 — Asserção (1) do SC#3: snapshot inline sobre o artefato

```typescript
// docs/compliance/__tests__/exportAllowlist.test.ts  (ou src/…/__tests__/)
// ⚠ o `include` do Vitest é '**/__tests__/**/*.{test,spec}.{ts,tsx}'
//    [VERIFIED: vite.config.ts] — o arquivo TEM de morar num __tests__/.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Idioma de sonda por texto-fonte já vivo no repo
// [VERIFIED: supabase/functions/_shared/__tests__/strict-schema.test.ts:36-40]
const ALLOWLIST = JSON.parse(
  readFileSync(resolve(__dirname, '../export-allowlist.json'), 'utf8'),
)

describe('EXPORT-04 — as chaves do export são um contrato, não um acidente', () => {
  it('(a) o conjunto de TABELAS do export não muda em silêncio', () => {
    expect(Object.keys(ALLOWLIST.tabelas).sort()).toMatchInlineSnapshot()
    //                                            ^ vitest preenche no primeiro -u
  })

  it('(b) o conjunto de COLUNAS de cada tabela não muda em silêncio', () => {
    const achatado = Object.entries(ALLOWLIST.tabelas)
      .flatMap(([t, d]: any) => d.colunas.map((c: string) => `${t}.${c}`))
      .sort()
    expect(achatado).toMatchInlineSnapshot()
  })

  it('(c) NENHUM segredo e NENHUMA telemetria atravessou a allowlist', () => {
    const achatado = JSON.stringify(ALLOWLIST.tabelas)
    for (const proibido of [
      'smtp_senha_encrypted', 'webhook_secret', 'secret',
      'session_token', 'hash_cpf_email', 'ai_call_logs',
    ]) expect(achatado).not.toContain(proibido)
  })

  it('(d) o artefato declara a Phase 45 como consumidora (SC#5)', () => {
    expect(ALLOWLIST.meta.consumidores.join(' ')).toContain('Phase 45')
    expect(ALLOWLIST.meta.versao).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
```

**Por que inline e não `.snap`:** em CI o Vitest **não escreve** snapshot — mismatch, ausência ou
snapshot obsoleto **falham o run** [VERIFIED: Context7 — vitest `docs/guide/snapshot.md`, "CI
behavior"]. Os dois modos falham igual; o inline põe o diff dentro do PR, que é onde um humano o lê.
A asserção **(c)** é a que não depende de snapshot nenhum — é a rede de segurança que sobrevive a um
`-u` distraído.

### E5 — Asserção (2) do SC#3: smoke SQL contra o catálogo vivo

```sql
-- docs/compliance/sql/05-export-allowlist-drift.sql
-- Requirement: EXPORT-04 (SC#3, asserção 2 de 2)
-- Natureza: READ-ONLY — seguro em PROD. Zero statement de escrita; só catálogo.
-- Como executar: pelo ORQUESTRADOR via execute_sql do MCP (subagentes GSD não
--   recebem esses tools — anthropics/claude-code#13898). Idioma idêntico ao de
--   01-pii-catalog.sql e 04-invent05-blast-radius.sql.
--
-- ⚠ POR QUE ESTE ARQUIVO EXISTE, e por que a asserção Vitest NÃO o substitui:
--   o Vitest lê o ARTEFATO commitado; este lê o CATÁLOGO. Uma coluna nova no
--   banco não move um byte do JSON — logo o snapshot passa e o SC#3 estaria
--   satisfeito só na aparência. Este é o guarda que morde pelo motivo declarado.
--
-- COLE a allowlist vigente no VALUES abaixo, gerada por:
--   node docs/compliance/sql/gen-export-allowlist.cjs --sql-values

WITH allowlist(tabela, coluna) AS (
  VALUES
    ('candidatos','id'), ('candidatos','nome_completo') -- … gerado, nunca digitado
),
vivo AS (
  SELECT c.table_name::text AS tabela, c.column_name::text AS coluna
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name  = c.table_name
     AND t.table_type  = 'BASE TABLE'
   WHERE c.table_schema = 'public'
     AND c.table_name IN (SELECT DISTINCT tabela FROM allowlist)
)
SELECT
  COALESCE(v.tabela, a.tabela) AS tabela,
  COALESCE(v.coluna, a.coluna) AS coluna,
  CASE
    WHEN a.coluna IS NULL THEN 'COLUNA NOVA NO BANCO — fora da allowlist'
    WHEN v.coluna IS NULL THEN 'COLUNA DA ALLOWLIST SUMIU DO BANCO'
  END AS veredito
FROM vivo v
FULL OUTER JOIN allowlist a
  ON a.tabela = v.tabela AND a.coluna = v.coluna
WHERE a.coluna IS NULL OR v.coluna IS NULL
ORDER BY 1, 2;

-- ✅ APROVADO  = 0 linhas.
-- ❌ REPROVADO = qualquer linha. As duas direções importam, e por razões
--    DIFERENTES: "coluna nova" é o vazamento em potencial (alguém precisa
--    decidir se ela é dado do titular); "coluna sumiu" é o export entregando
--    menos do que declara — a mentira por omissão que o EXPORT-06 combate.
--
-- ⚠ PROVA DE QUE O GATE MORDE (idioma de scripts/assert-no-secrets.mjs:33-45):
--    remova uma linha do VALUES e re-execute → tem de devolver ≥1 linha.
--    Um gate que nunca foi visto falhando não é um gate. Colar o par
--    antes/depois no VERIFICATION.md.
```

### E6 — Escape do HTML (Pitfall 6)

```typescript
/** Todo valor do titular passa por aqui antes de entrar no HTML autocontido.
 *  O arquivo abre em file://, sem CSP nenhuma; e os campos livres foram
 *  digitados por humanos (inclusive por terceiros — observacoes_rh). */
const escapeHtml = (v: unknown): string =>
  String(v ?? '—')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RH lia CV direto do Storage por policy de papel | EF `get-curriculo-url` como único caminho privilegiado | Phase 32 (`20260715000001`) | O candidato **manteve** a leitura own-folder — é o que torna o caminho client-side do Achado #1 viável |
| Inventário de PII derivado de arquivos de migration | Catálogo **vivo** via `execute_sql` | Phase 42 / D-P42-18 | Toda medição desta fase herda a regra |
| `supabase db push` para migrations | `apply_migration` por MCP, pelo orquestrador | Phase 42/43 | `db push` é **proibido** neste projeto para migrations PL/pgSQL |
| Limiares de SLA compilados no cliente (Phase 34) | Tabela de config alterável sem deploy + classificador **total** com faixa `degenerado` | Phase 42 / D-P42-02 | Molde direto de `config_sla_dados` |
| `zod` v3 (`^3.22.4`) | — | — | O projeto **não** migrou para zod v4; schemas novos seguem v3 [VERIFIED: package.json:66] |

**Deprecated/outdated nesta fase:**
- `jspdf` / `jspdf-autotable` **existem como dependências** (`^4.2.1` / `^5.0.8`) mas são
  **explicitamente rejeitados** para os arquivos de export pela UI-SPEC §Registry Safety. Registrado
  para que o executor não os alcance por reflexo só porque estão instalados.
- `sonner` (toast) está instalado e **não é usado** nesta fase (o sucesso precisa persistir).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O import estático de JSON de fora do diretório da função sobrevive ao bundler do `supabase functions deploy` | §E2 | Deploy quebra ou a allowlist chega vazia; mitigação já prescrita (emitir `.ts` em vez de `.json`) — **provar no deploy** |
| A2 | As policies do bucket `curriculos` em PROD são as do arquivo `20260715000001` | §Achado #1 | Drift é fato recorrente; se a own-folder não existir, o caminho client-side do CV falha. **Fecha com M4** |
| A3 | Todo `curriculo_url` não-nulo começa com o `user_id` do dono | §Achado #1 | Um CV legado com outro prefixo não é alcançável pelo titular. **Fecha com M5** |
| A4 | Os números 64/993/102 do YAML ainda descrevem PROD | §Summary, §Pattern 2 | Colunas da Phase 43 podem já ter mudado o total. **Fecha com M1** |
| A5 | `situacao`/`causa`/`tipo` terão exatamente os tokens da UI-SPEC | §Pattern 4 | O vocabulário é da UI-SPEC (`atendido`/`pendente`; `falha_geracao`/`curriculo_ausente`/`permissao`) — as **tabelas não existem ainda**, então nenhum valor foi lido de DDL vivo. Divergência entre CHECK e cliente = célula em branco |
| A6 | 15 dias do Art. 19, II são **dias corridos** | §Pattern 5, copy | O texto legal diz "prazo de até 15 (quinze) dias", **sem qualificar "corridos"** [WebSearch, LOW]. A leitura de dias corridos é a corrente, mas a afirmação na copy é do produto. **Não é decisão de engenharia** |
| A7 | O contador do menu do RH pode ser servido por RPC nova espelhando `contar_revisoes_pendentes` | §Diagram | Depende de OQ-2 (escopo). Badge e fila **têm de compartilhar o escopo**, senão o menu conta o que a fila não mostra (advertência viva na P42) |
| A8 | `js-yaml` continuará hoisted enquanto `@testing-library/*` não mudar | §Achado #2 | O gerador **e** o `--check` quebram juntos |

---

## Open Questions

### OQ-1 — Quem minta o signed URL do CV do titular? *(decisão de arquitetura; recomendação forte)*
- **What we know:** `get-curriculo-url` devolve 403 ao candidato (medido). A policy own-folder viva
  autoriza o próprio titular, e `createSignedUrl` exige exatamente `SELECT` em `storage.objects`
  (Context7). O TTL de 60 s é idêntico nos dois caminhos.
- **What's unclear:** o CONTEXT Área 3 descreve a EF como "clone estrutural de `get-curriculo-url`",
  o que **sugere** que a EF minta a URL — mas a Invariante 4 da UI-SPEC proíbe a URL de entrar no
  payload do export, então o clique do CV é um segundo caminho de qualquer forma.
- **Recommendation:** **caminho client-side** (§E3). Ele é estritamente **menos** superfície (zero
  `service_role` no caminho do CV do titular), não contradiz nenhuma decisão travada, e reusa o
  mecanismo do `CvButton` verbatim. Confirmar com M4+M5 antes de travar. Se M4 mostrar que a policy
  own-folder **não** existe em PROD, a decisão inverte e vira ação da EF — e aí o plano precisa de
  uma tarefa a mais.

### OQ-2 — Qual o escopo de DADOS da fila `/rh/pedidos-dados`? *(decisão de política — escalar ao operador)*
- **What we know:** `listar_revisoes_decisao` restringe o `rh` às vagas com `created_by = auth.uid()`
  (predicado verbatim citado no Achado #4). Um pedido de acesso **não tem vaga**.
- **What's unclear:** um recrutador deve ver (a) todos os pedidos, (b) só de candidatos com
  candidatura em vaga sua, ou (c) só `administrador` vê a fila?
- **Trade-off honesto:** (a) é o mais útil para supervisão de compliance e o mais coerente com a
  UI-SPEC ("não é role-gated: a supervisão é trabalho de RH"), mas **fura** o invariante de escopo por
  vaga que SEC-05-08 e a P42 construíram — um recrutador passaria a ver nomes de candidatos de vagas
  alheias. (b) preserva o invariante mas produz **buracos de supervisão**: um pedido de candidato sem
  candidatura nenhuma não apareceria para ninguém além do admin, e é justamente um pedido que consome
  prazo legal. (c) é seguro e reduz a fila a uma tela que quase ninguém abre.
- **Recommendation:** **(b) com um `UNION` para o administrador ver tudo**, e — importante — o
  administrador é quem enxerga os órfãos. Mas isto é **decisão do operador**, não da engenharia:
  envolve quem responde legalmente pelo Art. 19, II. O que a engenharia pode afirmar é que **fila e
  contador têm de usar o MESMO predicado**, sob pena de o badge contar o que a tela não mostra.

### OQ-3 — Uma migration ou duas?
- Duas tabelas independentes. Duas migrations tornam o `repair` do ledger mais granular se o 42601
  aparecer; uma só reduz o número de aplicações manuais. **Recommendation:** **duas**, na ordem
  `config_sla_dados` → `solicitacoes_dados`, porque a config não tem dependência e seu apply é o teste
  barato do procedimento antes da tabela que importa.

### OQ-4 — Promover `js-yaml` a devDependency explícita?
- Ver Achado #2. **Recommendation:** sim, opção (b). É mudança de `package.json` e por isso merece
  estar no plano como item nomeado, não como efeito colateral.

### OQ-5 — O `.html` deve incluir a versão da allowlist?
- O `.json` claramente sim (`versao_allowlist` no envelope). O `.html` é para uma pessoa. Um rodapé
  discreto tornaria uma cópia auditável meses depois. **Recommendation:** sim, no rodapé, junto ao
  carimbo de data que a UI-SPEC já torna obrigatório. Custo zero, e é o que permite a alguém provar
  qual escopo estava vigente naquele dia.

---

## Environment Availability

Medido em 2026-08-03, na máquina de desenvolvimento.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, gerador, scripts | ✓ | v24.18.0 | — |
| Supabase CLI | `npm run db:types`, `migration repair`, `functions deploy` | ✓ | 2.111.0 | — |
| Deno | testes da EF (`deno test`) | ✓ | 2.9.4 | — |
| `js-yaml` | gerador da allowlist | ⚠ **transitivo** | 3.14.2 | promover a devDependency (Achado #2) |
| Vitest | asserção (1) do SC#3 | ✓ | ^4.1.9 (`@vitest/ui` ^4.1.9) | — |
| **Supabase MCP (`execute_sql`, `list_tables`)** | M1–M5, apply das migrations, smoke SQL | ✗ **NO SUBAGENTE** | — | **executado pelo ORQUESTRADOR / main thread** |
| Playwright | E2E (não requerido por esta fase) | ✓ (`^1.56.1` declarado) | — | — |

**Missing dependencies with no fallback:** nenhuma.

**Missing dependencies with fallback:**
- **Supabase MCP** — não é falta de ferramenta, é fronteira de agente (anthropics/claude-code#13898).
  **Consequência de planejamento, não descoberta de meio de fase:** toda tarefa que meça o catálogo
  vivo, aplique migration ou rode o smoke SQL tem de ser uma tarefa do **orquestrador**, com o output
  colado no plano/VERIFICATION. Nenhuma tarefa de executor pode depender de tocar PROD.
- **`js-yaml`** — presente; falta só a declaração.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest **4.1.9** + happy-dom 20.10.6 (unit/component) · Playwright 1.56.1 (E2E, não usado aqui) · `deno test` (EFs) |
| Config file | `vite.config.ts` (bloco `test:`) — `globals: true`, `environment: 'happy-dom'`, `setupFiles: ['./tests/setup.ts']`, `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']` [VERIFIED: vite.config.ts] |
| Quick run command | `npx vitest run <caminho>` |
| Full suite command | `npm run test:run` |
| Type gate | `npm run lint` = `tsc --noEmit`; **baseline de não-regressão 97 local / 104 CI** [VERIFIED: .husky/pre-commit:44-48, .github/workflows/ci.yml:63-67] |
| CI | `.github/workflows/ci.yml:70` roda `npm run test:run` |

⚠ **Duas armadilhas de configuração que o plano tem de respeitar:**
1. O `include` só pega arquivos dentro de `**/__tests__/**`. Um teste em
   `docs/compliance/exportAllowlist.test.ts` **não roda** — tem de ser
   `docs/compliance/__tests__/exportAllowlist.test.ts`.
2. Toda EF com `import` de `https://esm.sh`/`https://deno.land` **tem de ser adicionada ao array
   `exclude`** do `vite.config.ts`, senão o `npm run test:run` quebra por resolução de módulo. Há 15+
   entradas literais lá, uma por EF, com comentário — o padrão é literal, **nunca** glob de diretório.
   `supabase/functions/exportar-meus-dados/**/*.test.ts` é a linha a acrescentar, **no mesmo commit**
   que criar o teste da EF.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPORT-01 | Clique no CTA dispara a mutation e os dois downloads (`.json` primeiro) | unit (component) | `npx vitest run src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx` | ❌ Wave 0 |
| EXPORT-01 | Cooldown: botão desabilitado **nunca** sem motivo visível ao lado (asserção **estrutural**) | unit (component) | idem | ❌ Wave 0 |
| EXPORT-01 | Falha da leitura de estado **não** derruba o bloco; o CTA renderiza mesmo assim | unit (component) | idem | ❌ Wave 0 |
| EXPORT-02 | A EF projeta por allowlist e **nunca** `select('*')` | unit (Deno, `Deps` mockado) | `deno test supabase/functions/exportar-meus-dados/__tests__/index.test.ts` | ❌ Wave 0 |
| EXPORT-02 | `candidato_id` do corpo é **ignorado**; a resolução vem de `auth.uid()` | unit (Deno) | idem | ❌ Wave 0 |
| EXPORT-02 | Segredos e `ai_call_logs` ausentes do artefato (asserção **negativa**, sem snapshot) | unit | `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts` | ❌ Wave 0 |
| EXPORT-03 | O signed URL **nunca** entra em estado, cache, arquivo ou `console.*` | unit (component + serviço) | `npx vitest run src/features/privacidade/components/__tests__/CurriculosBloco.test.tsx` | ❌ Wave 0 |
| EXPORT-03 | O CV do titular é alcançável **ao vivo** (fecha o Achado #1) | **manual / live UAT** | login de candidato real + clique | ❌ — não automatizável (Storage real) |
| **EXPORT-04** | **(1)** chaves da allowlist sob snapshot inline; muda ⇒ CI falha | unit | `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts` | ❌ Wave 0 |
| **EXPORT-04** | **(2)** coluna **nova** ou **sumida** no banco ⇒ smoke SQL devolve ≥1 linha | **SQL smoke (orquestrador via MCP)** | `docs/compliance/sql/05-export-allowlist-drift.sql` | ❌ Wave 0 |
| **EXPORT-04** | **prova de que (2) morde** — remover uma linha do VALUES e ver falhar | **manual (evidenciado no VERIFICATION)** | idem | ❌ Wave 0 |
| EXPORT-05 | `classifySlaDados === classifyRevisaoSla` (identidade de **referência**) | unit | `npx vitest run src/features/pedidos-dados/constants/__tests__/slaDados.test.ts` | ❌ Wave 0 |
| EXPORT-05 | Linha **não atendida** distinguível por canal **textual** (nunca por classe de cor) | unit (component) | `npx vitest run src/features/pedidos-dados/components/__tests__/FilaPedidosDadosTable.test.tsx` | ❌ Wave 0 |
| EXPORT-05 | Config ausente/`0`/ordem invertida ⇒ faixa degenerada, nunca erro de tela | unit | idem | ❌ Wave 0 |
| EXPORT-05 | Ordenação composta (pendentes ASC → atendidos DESC) — o que torna o aviso de corte verdadeiro | SQL smoke (orquestrador) | inline sobre a RPC | ❌ Wave 0 |
| EXPORT-06 | `meta.versao` + `meta.consumidores` contendo "Phase 45" | unit | `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts` | ❌ Wave 0 |
| EXPORT-06 | `gen-export-allowlist.cjs --check` sai 1 quando o JSON diverge da fonte | unit ou script | `node docs/compliance/sql/gen-export-allowlist.cjs --check` | ❌ Wave 0 |
| — | HTML gerado escapa `<script>` de campo livre (Pitfall 6) | unit (função pura) | `npx vitest run src/features/privacidade/services/__tests__/exportacaoService.test.ts` | ❌ Wave 0 |
| — | Bans de copy da UI-SPEC, **com o escopo de grep declarado na tabela** | unit (sonda de texto-fonte) | idem | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run <arquivos tocados>` **+** `npm run lint` (o pre-commit congela
  em 97 e **morde antes do CI**).
- **Per wave merge:** `npm run test:run` (suíte completa) + `node docs/compliance/sql/gen-export-allowlist.cjs --check`.
- **Phase gate:** suíte verde **+** o smoke SQL `05-export-allowlist-drift.sql` executado pelo
  orquestrador contra PROD com **0 linhas**, **+** a prova de que ele morde (par antes/depois colado
  no `44-VERIFICATION.md`) antes de `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `docs/compliance/__tests__/exportAllowlist.test.ts` — cobre EXPORT-02, EXPORT-04(1), EXPORT-06
- [ ] `docs/compliance/sql/05-export-allowlist-drift.sql` — cobre EXPORT-04(2) **e a prova de mordida**
- [ ] `supabase/functions/exportar-meus-dados/__tests__/index.test.ts` — cobre EXPORT-02 (Deno)
- [ ] **+1 linha literal no `exclude` do `vite.config.ts`** para a EF nova — no mesmo commit
- [ ] `src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx` — EXPORT-01
- [ ] `src/features/privacidade/components/__tests__/CurriculosBloco.test.tsx` — EXPORT-03
- [ ] `src/features/privacidade/services/__tests__/exportacaoService.test.ts` — geradores puros, escape, bans de copy
- [ ] `src/features/pedidos-dados/constants/__tests__/slaDados.test.ts` — identidade de referência
- [ ] `src/features/pedidos-dados/components/__tests__/FilaPedidosDadosTable.test.tsx` — EXPORT-05
- [ ] Framework install: **nenhum** — Vitest 4 e Deno já estão vivos

**Nota sobre snapshot:** a técnica estreia neste repositório (zero ocorrências hoje). A Wave 0 deve
gerar o snapshot com `npx vitest run <arquivo> -u` **uma vez**, revisar o conteúdo gerado **à mão**
(um snapshot aceito sem leitura é um contrato que ninguém assinou) e commitá-lo junto.

---

## Security Domain

`security_enforcement` não está desabilitado em `.planning/config.json` → seção obrigatória. O ROADMAP
marca esta fase como **candidata a `/gsd-secure-phase`** e a descreve como "superfície de exfiltração
de PII por desenho".

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **sim** | EF com JWT-ON (nunca `--no-verify-jwt`); `supabaseUser.auth.getUser()` como passo 1 (D-23) |
| V3 Session Management | **sim** | Sessão do Supabase Auth; `service_role` **jamais** no cliente (C1); cooldown persistido, nunca em memória |
| V4 Access Control | **sim — o eixo central** | own-row derivado de `auth.uid()`; authenticate ≠ authorize; RLS own-row nas duas tabelas novas; escopo explícito dentro do `SECURITY DEFINER`; RH sem caminho de download (Invariante 5 da UI-SPEC) |
| V5 Input Validation | **sim (superfície mínima)** | A EF **não lê corpo** (Desvio 2). O que entra do usuário é `path` do CV — e mesmo ele é lido do banco, não do cliente. Zod v3 se algum input aparecer |
| V6 Cryptography | **não diretamente** | Signed URL cunhada pelo Storage do Supabase; nada de cripto hand-rolled |
| V7 Error Handling & Logging | **sim** | Vocabulário fechado de causas; nunca erro cru na tela; log redigido (`{ pedido_id }`, jamais payload/URL) |
| V8 Data Protection | **sim — o eixo central** | Allowlist explícita; segredos vetados por lista; TTL de 60 s; nomes de arquivo sem PII; `ai_call_logs` fora |
| V12 Files & Resources | **sim** | Bucket privado; sem base64; sem conteúdo do CV nos arquivos; `download` cross-origin é ignorado pelo browser → rótulo "Abrir", nunca "Baixar" |
| V13 API & Web Service | **sim** | CORS clonado do molde; `POST`/`OPTIONS` apenas; 429 para cooldown |

### Known Threat Patterns for {Supabase EF + Postgres RLS + React SPA}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `select('*')` vaza coluna sob RLS own-row | Information Disclosure | Allowlist nomeada; RLS é row-level e **não** esconde coluna. 2 incidentes prévios; 58 ocorrências vivas hoje |
| `candidato_id` vindo do cliente (**T-32-03**) | Tampering | Resolver de `auth.uid()`; a EF nem lê o corpo |
| authenticate sem authorize (landmine P10/P11) | Elevation of Privilege | Passo 2 obrigatório **antes** de qualquer leitura privilegiada |
| Signed URL persistido/logado | Information Disclosure | TTL 60 s + nunca em estado/cache/arquivo/`console` |
| Iteração do endpoint como amplificador de exfiltração | Information Disclosure / DoS | Cooldown de 24 h **na tabela**, verificado server-side, 429 |
| Segredo do schema `public` entrando no export | Information Disclosure | `colunas_nunca` no gerador + asserção **negativa** no Vitest (achado A-05 do YAML) |
| Coluna nova entrando no export por acidente | Information Disclosure | O smoke SQL — e **só** ele detecta isso |
| XSS no HTML gerado, aberto em `file://` sem CSP | Tampering / Elevation | `escapeHtml` em todo valor interpolado + teste com payload hostil |
| Drift PROD→repo mascarando o schema real | Repudiation / Information Disclosure | Medição do catálogo vivo com `medido_em` no artefato |
| Fila do RH virando 2ª superfície de exfiltração | Information Disclosure | Zero ação, zero caminho de download, zero PII além de nome + datas (Invariante 5) |
| RLS de config copiada de `config_sla_etapa` (public-read) | Information Disclosure | Policy RH-only explícita; o próprio comentário da P42 alerta |
| RH cross-recruiter vendo pedidos alheios | Information Disclosure | **OQ-2** — decisão de política, escalada ao operador |

---

## G — Migration Mechanics (prescrição explícita)

**Sim, as duas migrations desta fase tropeçam no 42601 se aplicadas por `db push`** — mas não pela
razão óbvia. Vale ser preciso:

- O gatilho documentado é a combinação **corpo `$$…$$` adjacente a `COMMENT`/`GRANT`/`REVOKE`** num
  arquivo enviado ao transaction pooler como statement preparado (CLAUDE.md §Migrations).
- `config_sla_dados` sozinha, se for **só** `CREATE TABLE` + `ALTER … ENABLE RLS` + `CREATE POLICY` +
  `INSERT`, **não** tem corpo `$$`. Mas ela vai levar `COMMENT ON TABLE`/`COMMENT ON COLUMN` (idioma
  vivo da P42) e — se copiar o molde inteiro — o `CREATE TRIGGER … EXECUTE FUNCTION
  public.tocar_atualizado_em()` [VERIFIED: `20260730000001…:521-523`]. O `CREATE TRIGGER` referencia a
  função existente, **não** redefine corpo nenhum — a P42 é explícita: *"A função de carimbo já existe
  desde a P37 e é reutilizável tal como está … Ela NÃO é redefinida aqui"*.
- `solicitacoes_dados` **vai** ter corpo `$$`: a RPC `listar_pedidos_dados` e a RPC de contagem são
  `LANGUAGE plpgsql … AS $$ … $$`, e vêm cercadas de `REVOKE`/`GRANT`/`COMMENT`. **Essa é exatamente
  a combinação recusada.**

**Prescrição (não descobrir isto no meio da execução):**

1. **`supabase db push` é proibido neste projeto para estas migrations.** O apply é por
   `apply_migration` do MCP, **pelo orquestrador** — precedente vivo e documentado
   [VERIFIED: supabase/migrations/20260801000002_p43_config_retencao.sql:18-26].
2. **Zero wrapper `BEGIN;`/`COMMIT;`** no topo/fim do arquivo. Nota inline obrigatória explicando o
   motivo — o idioma exato já existe em dois arquivos vivos.
3. **`apply_migration` carimba a PRÓPRIA `version`** (timestamp do instante), que **não** é o prefixo
   do arquivo. Consequência: depois do apply, `supabase migration repair --status applied <version>`
   para reconciliar o ledger, e confirmar com `supabase db push --linked` respondendo *"Remote
   database is up to date"*. Sem isso, o débito de drift do ledger cresce — este projeto já carrega
   **7 versions órfãs** de 07-13/07-14 [VERIFIED: .planning/STATE.md §drift pré-existente].
4. **Ordem:** `config_sla_dados` primeiro (sem `$$`, apply barato, valida o procedimento), depois
   `solicitacoes_dados` + RPCs.
5. **Numeração:** a última migration do ledger é `20260803000001_p43_fix_listar_matriz_cast.sql`
   [VERIFIED: `ls supabase/migrations/`]. Próximos livres: `20260804000001` / `20260804000002`.
   ⚠ Precedente vivo de colisão: o plano 42-08 teve de renumerar porque o 42-07 tomou o número —
   **confirmar o ledger imediatamente antes de nomear o arquivo**, não no início do planejamento.
6. **Depois dos dois applies:** `npm run db:types` (nunca editar `database.types.ts` à mão — C4).
7. **Comportamento documentado do gerador de tipos** que vai morder aqui: colunas de `RETURNS TABLE`
   saem **não-nulas** no tipo gerado porque a assinatura SQL não carrega nulidade. A P42 resolveu
   escrevendo o tipo da linha da fila **à mão**, com nulidade honesta
   [VERIFIED: src/features/revisao/services/revisaoService.ts:193-210]. `FilaPedidoDadosRow` deve
   fazer o mesmo — `candidato_nome: string | null` é o que permite a UI resolver "Não identificado"
   em vez de um `.toUpperCase()` em `null` com o compilador calado.

---

## Sources

### Primary (HIGH confidence — código e artefatos vivos deste repositório, lidos em 2026-08-03)
- `supabase/functions/get-curriculo-url/index.ts` — molde da EF; o 403 do Achado #1 (`:139-141`)
- `supabase/migrations/20260715000001_curriculos_drop_rh_read.sql:34-41` — policy own-folder viva
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:38-42` — `candidato_le_propria_candidatura`
- `supabase/migrations/20260730000001_p42_revisao_art20.sql:280-360, 432-523` — RPC com escopo explícito, `config_sla_revisao`, trigger
- `supabase/migrations/20260801000002_p43_config_retencao.sql:18-30` — protocolo de apply / 42601
- `docs/compliance/pii-inventory.yaml:6-46, 404-409, 500-527` — meta, vocabulário, achados A-05/A-06
- `docs/compliance/sql/01-pii-catalog.sql` · `04-invent05-blast-radius.sql` — consultas reprodutoras e a disciplina do "mesma consulta, duas vezes"
- `docs/compliance/sql/gen-pii-md.cjs:22, 110-125` — molde do gerador e do `--check`
- `src/features/revisao/constants/slaRevisao.ts` · `components/RevisaoSlaBadge.tsx` · `services/revisaoService.ts:180-188` — as três reutilizações verificadas
- `src/features/hub-candidato/components/CvButton.tsx` — mecanismo de abrir aba
- `src/features/agendamento/services/agendamentoCandidatoService.ts:205-217` — idioma de download
- `src/features/privacidade/**` — shell, allowlist nomeada, `traduzirErro`
- `src/components/RHSidebar.tsx:93-101, 124-132, 172-182` — os três sítios
- `src/router/routes.tsx:39, 53-55, 456-467` — `lazyNamed` + `RoleGuard`
- `vite.config.ts` · `.husky/pre-commit` · `.github/workflows/ci.yml` · `package.json` — infraestrutura de teste medida
- `scripts/assert-no-secrets.mjs:33-45` — o idioma do meta-teste ("um gate que nunca foi visto falhando não é um gate")
- `supabase/functions/_shared/__tests__/strict-schema.test.ts:36-40` — sonda por texto-fonte
- `.planning/STATE.md` · `.planning/ROADMAP.md:147-163` · `.planning/REQUIREMENTS.md:81-86`

### Secondary (MEDIUM confidence — Context7)
- Vitest — `docs/guide/snapshot.md` + `docs/api/expect.md`: os três matchers e o comportamento em CI
- Supabase — `apps/studio/.../Storage.constants.ts`: `createSignedUrl: ['SELECT']` sobre `storage.objects`

### Tertiary (LOW confidence — WebSearch, não confirmado em fonte oficial nesta sessão)
- LGPD Art. 19, II — "prazo de até 15 (quinze) dias, contado da data do requerimento do titular";
  o texto **não** qualifica "corridos"; a ANPD pode dispor prazos diferenciados por setor.
  [jusbrasil.com.br · lgpd-brasil.info · compliance.mspa.com.br]

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — zero dependência nova; todas as versões lidas de `package.json` e de
  `node_modules` hoje.
- **Architecture (EF, migrations, RLS, reuso):** HIGH — cada afirmação estrutural aponta para arquivo
  e linha lidos nesta sessão.
- **Allowlist / escopo do export:** **MEDIUM** — a semente é excelente e o método está prescrito, mas
  **a lista concreta de colunas não pode ser fixada sem as medições M1/M2**, que exigem o MCP do
  Supabase e portanto o orquestrador.
- **Caminho do CV do titular (Achado #1):** **MEDIUM-HIGH** — o 403 está medido no código; a
  viabilidade do caminho client-side depende de M4/M5 confirmarem PROD.
- **Escopo da fila do RH:** **LOW por desenho** — é decisão de política (OQ-2), não achado técnico.
- **Prazo do Art. 19, II:** **LOW** — WebSearch apenas; o adjetivo "corridos" é interpretação
  corrente, não literal do texto.
- **Pitfalls:** HIGH — todos derivados de incidentes já registrados neste repositório, com
  referência.

**Research date:** 2026-08-03
**Valid until:** **2026-08-10** para tudo que dependa do catálogo vivo (7 dias — o schema deste
projeto mudou em 3 dos últimos 5 dias úteis); 2026-09-02 para o restante (stack estável, sem
dependência nova).
