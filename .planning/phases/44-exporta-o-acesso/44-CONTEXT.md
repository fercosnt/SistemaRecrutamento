# Phase 44: Exportação & Acesso - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo) — 4 áreas cinzentas propostas em tabela e **aceitas
integralmente** pelo operador em 2026-08-03.

<domain>
## Phase Boundary

O candidato pede uma cópia dos próprios dados pelo painel e a recebe — e o sistema **projeta**,
exercitando-o em produção, o inventário de PII que a Phase 45 vai consumir como plano de exclusão.

**Propriedade que torna esta fase segura: READ-ONLY POR CONSTRUÇÃO** sobre PII. O portão de fase
destrutiva **não se aplica**. As únicas escritas são aditivas: a tabela de registro de pedidos
(`solicitacoes_dados`), sua config de prazo (`config_sla_dados`) e as linhas que elas recebem.

**Mas read-only não é o mesmo que baixo risco.** Esta é uma **superfície de exfiltração de PII por
desenho** — o ROADMAP a marca como candidata a `/gsd-secure-phase`, e o risco vive em quatro
lugares: a allowlist (uma coluna a mais vaza), o TTL do signed URL (um link vazável), a
autorização own-row (um `candidato_id` forjado lê a pessoa errada), e o escopo do que a EF
consegue ler com `service_role`.

Requirements: EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04, EXPORT-05, EXPORT-06 (6).

**A ordem EXPORT-antes-de-ERASE é a razão desta fase existir antes da 45**, não uma conveniência de
sequenciamento: a fase irreversível consome um plano de exclusão **já exercitado em produção** em
vez de um levantamento novo feito sob a pressão de uma migration destrutiva.

</domain>

<decisions>
## Implementation Decisions

### Área 1 · Forma da entrega do export

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

### Área 2 · A allowlist e o artefato de inventário (EXPORT-02 / EXPORT-06)

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

### Área 3 · Mecânica anti-vazamento (SC#2 / SC#3)

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

### Área 4 · Prazo do Art. 19, II e visibilidade do RH (SC#4)

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

</decisions>

<code_context>
## Existing Code Insights

Medido no repositório em 2026-08-03, antes de qualquer planejamento.

### Reusable Assets

- **`docs/compliance/pii-inventory.yaml`** (Phase 42 / plano 42-04, INVENT-01) — 64 tabelas base,
  993 colunas, 102 FKs, colhido do catálogo **vivo** de PROD via `execute_sql`, nunca derivado de
  arquivos de migration (o DDL base de ~40 tabelas legadas vive fora do ledger, em
  `docs/sql/sql/*.sql`). Traz vocabulário de classificação (`apagar` / `anonimizar` / `preservar` /
  `preservar_com_ressalva`) e regras de cobertura auditáveis. **Já declara a Phase 44 como
  consumidora.** A query reprodutora está em `docs/compliance/sql/01-pii-catalog.sql`.
- **`supabase/functions/get-curriculo-url/index.ts`** — o molde exato do SC#2. Two-client D-23,
  authenticate-THEN-authorize, entrada por `candidatura_id` (nunca path do cliente),
  `select('curriculo_url, vaga_id')` por allowlist, `createSignedUrl(path, 60)` sobre o bucket
  privado `curriculos`, `Deps` injetáveis para teste sem rede.
- **`src/features/privacidade/`** (Phase 43) — `PrivacidadeCandidatoPage` + `usePrivacidade` +
  `privacidadeService`, com o `ScreenShell` mobile-first clonado de `ExplicacaoCandidatoPage`
  (`BackgroundImage gradient` + overlay 15% + `container mx-auto px-4 max-w-2xl` + `GlassPanel`).
- **`src/features/revisao/`** (Phase 42) — `RevisoesRHPage`, `FilaRevisoesTable`, `RevisaoSlaBadge`,
  `useConfigSlaRevisao`, e `constants/slaRevisao.ts` com `classifyRevisaoSla`: classificador **puro
  e TOTAL** (nunca lança) com a faixa `degenerado` para config ausente/ilegível, mais o invariante
  colorblind-safe (rótulo textual sempre acompanha a cor).
- **`config_sla_revisao`** (`20260730000001_p42_revisao_art20.sql:442`) — o molde da tabela de
  limiares alteráveis sem deploy.

### Established Patterns

- **`select('*')` é a classe de vulnerabilidade nº 1 deste projeto** — dois incidentes anteriores,
  citada no SC#1 e anotada em `get-curriculo-url` como `[[reference_select_star_leaks_pii]]`.
- **authenticate ≠ authorize** — uma EF que faz `getUser()` e depois lê com `service_role` sem
  checar papel/posse deixa qualquer autenticado ler qualquer dado (landmine P10/P11).
- **Import estático de `esm.sh`** nas EFs — a forma construída em runtime
  (`["npm:",pkg].join("")`) escondeu o pacote do bundler e produziu `ERR_MODULE_NOT_FOUND` em P10-13.
- **Testes:** Vitest 4 + happy-dom para unit; Playwright para E2E; `npm run lint` é `tsc --noEmit`
  (não há ESLint). Serviços testados com clients mockados, sem rede.
- **Migrations com `$$ ... $$` + statements adjacentes** falham no pooler (42601) — aplicar pelo SQL
  Editor e `supabase migration repair --status applied <version>` (CLAUDE.md).

### Integration Points

- `/candidato/privacidade` — bloco novo abaixo de "O que guardamos e por quê".
- `src/router/routes.tsx` — rota nova `/rh/pedidos-dados`.
- Navegação RH — onde `/rh/revisoes` já aparece.
- `supabase/functions/exportar-meus-dados/` — EF nova, JWT-ON (não passar `--no-verify-jwt`).
- `database.types.ts` — regenerar após as migrations (`npm run db:types`), nunca editar à mão.

### ⚠ Riscos de contexto herdados

- **Nenhum snapshot test existe no repositório** (`toMatchSnapshot` / `toMatchInlineSnapshot`: zero
  ocorrências em `src/` e `supabase/`). O SC#3 estreia a técnica — o plano precisa decidir o
  mecanismo concreto, não presumir infraestrutura existente.
- **Drift PROD→repo é fato conhecido e recorrente** (quarta instância registrada na Phase 43: as 3
  policies de `autorizacoes` vivem em PROD e em nenhum arquivo de migration). **Corolário direto
  para esta fase:** a allowlist tem de ser conferida contra o **catálogo vivo**, não contra
  `supabase/migrations/`. Um export gerado a partir do que o repositório *acha* que é o schema
  omitiria colunas reais — e o smoke SQL da Área 3 é precisamente o que fecha esse buraco.

</code_context>

<specifics>
## Specific Ideas

- A honestidade do export é critério, não adorno: se o sistema guarda algo sobre a pessoa e o RH o
  enxerga, ele aparece na cópia. O que ficar de fora precisa de razão nomeada (telemetria interna,
  segredo de terceiro, dado que não é do titular) — não de esquecimento.
- O `export-allowlist.json` tem de declarar seus **consumidores** como o `pii-inventory.yaml` faz.
  É assim que a Phase 45 encontra o artefato em vez de refazer o levantamento — o SC#5 em forma
  executável.
- O smoke SQL da Área 3 roda contra PROD e é o mesmo instrumento que fecha o risco de drift. Ele
  precisa ser **reprodutível e versionado** (`docs/compliance/sql/`), como a query do INVENT-01.
- A fila do RH só é útil se um pedido **falho** for visualmente distinguível de um atendido. O valor
  do SC#4 está inteiro na falha, porque o caminho feliz é automático.
- `solicitacoes_dados` nasce com `tipo` mesmo com um único valor em uso — a economia é para a
  Phase 45, que é a fase de maior risco do milestone e não pode gastar orçamento de risco com
  migration de retrofit.

</specifics>

<deferred>
## Deferred Ideas

- **Export assíncrono via `notificar-candidato`** — desnecessário na escala atual (21 candidatos);
  reabrir só se o payload ou a base crescerem.
- **RH exportar dados em nome do candidato** — pertence à superfície de atendimento, não a esta
  fase; a P45 traz o fluxo RH sobre pedidos do titular.
- **`tipo = 'exclusao'` em `solicitacoes_dados`** — a coluna nasce aqui, o valor entra na Phase 45.
- **`ai_call_logs` no export** — deliberadamente fora do escopo (telemetria interna, não dado do
  titular). Se algum dia entrar, é decisão nova e nomeada.

</deferred>
