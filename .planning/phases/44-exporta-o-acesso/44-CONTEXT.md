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

---

## Adendo pós-pesquisa — medições do catálogo vivo e 1 decisão do operador (2026-08-03)

A `44-RESEARCH.md` declarou uma lacuna honesta (subagentes GSD não recebem os tools MCP do
Supabase) e prescreveu cinco medições READ-ONLY para o orquestrador. **Quatro rodaram**; os números
estão em `44-MEASUREMENTS.md`, medidos em 2026-08-03 06:09–06:11 UTC. Uma questão de política foi
levada ao operador e respondida.

### BD-6 · A allowlist NÃO pode ter o YAML como fonte única — **medido, não suposto**

O catálogo vivo tem **67 tabelas / 1013 colunas / 104 FKs**; o `pii-inventory.yaml` declara
**64 / 993 / 102**. Cinco dias de drift. E o drift caiu exatamente no lugar que esta fase depende:

**Quatro colunas de `autorizacoes` não aparecem NENHUMA vez no YAML** —
`consent_text_version`, `consent_text_hash`, `consent_registrado_em`, `autorizacao_marketing_vagas`.
São precisamente as "colunas de consentimento versionado" que o ROADMAP nomeia como a razão de a
Phase 44 depender da Phase 43.

**A decisão da Área 2 (allowlist derivada do inventário) continua certa — o insumo é que está
velho.** Executada literalmente contra o YAML de hoje, ela produziria um `export-allowlist.json`
que omite em silêncio a própria dependência declarada da fase.

**Resolução travada:** o gerador lê o **catálogo vivo** como fonte da *existência* de colunas e o
YAML como fonte da *classificação*. Coluna viva sem classificação é **erro de fechamento** que
falha a geração — nunca omissão silenciosa. (A alternativa — atualizar o YAML primeiro — resolve
hoje e reabre no próximo drift, que a Phase 45 herdaria.)

### BD-7 · Caminho do CV — **client-side**, confirmado por medição

O `get-curriculo-url` devolve **403 ao candidato** (é RH-only por desenho, Phase 32). A pesquisa
recomendou o caminho client-side e condicionou-o a M4+M5. Ambas mediram a favor:

- **M4:** as policies de SELECT do bucket `curriculos` são **duas**, OR'd, com convenções de pasta
  diferentes (`candidatos.id` e `auth.uid()`). O titular lê o próprio CV sob **qualquer** das duas.
- **M5:** dos **3** CVs vivos, **3** usam o prefixo `auth.uid()`, zero usam `candidatos.id`.

**O candidato cunha o próprio signed URL de 60 s client-side**, com `service_role` fora do caminho
do CV do titular — estritamente menos superfície que a EF. ⚠ **n = 3**: o plano trata "o titular lê
o próprio CV" como asserção **testada em runtime com falha por linha**, nunca como invariante
assumido a partir de três linhas.

### BD-8 · Escopo da fila `/rh/pedidos-dados` — **por vaga + administrador vê tudo** (decisão do operador)

Um pedido de acesso **não tem vaga**, então o predicado de escopo-por-vaga da P42/SEC-05-08 não se
aplica sozinho. Decisão do operador em 2026-08-03:

- **Recrutador** vê pedidos de candidatos com candidatura em vaga sua (preserva o invariante
  horizontal que a P32 fechou como BLOCKING).
- **Administrador** vê a fila inteira — **inclusive os órfãos** (pedido de candidato sem candidatura
  nenhuma). O órfão é justamente o pedido que consome prazo legal sem ter dono natural; o admin é
  o dono.

⚠ **Invariante que a engenharia impõe sobre esta decisão:** **fila e contador do menu usam o MESMO
predicado.** Um badge que conta o que a tela não mostra manda o operador procurar trabalho
invisível — e aqui esse trabalho tem prazo de 15 dias.

### Decisões adotadas das recomendações da pesquisa (sem escalar)

- **Duas migrations**, na ordem `config_sla_dados` → `solicitacoes_dados`. A config não tem
  dependência: seu apply é o teste barato do procedimento 42601 antes da tabela que importa.
- **`js-yaml` promovido a devDependency explícita.** Hoje é dependência-fantasma (usado por
  `gen-pii-md.cjs:22`, ausente do `package.json`, presente só por hoisting de
  `@testing-library` em 3.14.2). Um bump futuro mataria o gerador e seu `--check` juntos. Usar
  `safeLoad` (3.x `load` usa `DEFAULT_FULL_SCHEMA`).
- **O `.html` carrega a versão da allowlist no rodapé**, junto ao carimbo de data. É o que permite
  provar meses depois qual escopo estava vigente naquele dia.

### M3 continua pendente, por construção

`pg_policies` das duas tabelas novas só é mensurável **depois** do apply. É tarefa do plano,
imediatamente após a migration e antes de qualquer asserção de RLS ser declarada satisfeita — o
idioma "o arquivo não é o objeto vivo" que a P42 (42-07) e a P43 (A1) já pagaram duas vezes para
aprender.

---

## Adendo 2026-10-06 — G5 (drift do export vivo): decisões

A reverificação de 2026-10-06 (`44-VERIFICATION.md`, gap G5) mediu 9 colunas sem veredito em
tabelas em escopo e 6 tabelas base de `public` que nem a allowlist nem o catálogo versionado
conhecem. As decisões abaixo fecham o G5. **A autoria de cada uma está marcada, e não se mistura:**

- **OPERADOR** — respostas do operador (Fernando) a perguntas do orquestrador por AskUserQuestion
  em 2026-10-06;
- **ORQUESTRADOR** — inclinação padrão escrita no prompt de planejamento, **não perguntada ao
  operador**;
- **PLANEJADOR** — decisão tomada no planejamento, com a razão escrita aqui.

### BD-9 · `cognitivo_liberacao` ENTRA na cópia

- **Autoria:** OPERADOR (2026-10-06).
- **Decisão:** é dado do titular sob o Art. 18, II — a liberação/revogação da avaliação cognitiva
  da candidatura dele.
- **Efeito na cópia:** entram `liberado_em`, `revogado_em`, `motivo`; ficam fora, com razão nomeada
  (PII de terceiro), `liberado_por` e `revogado_por` (ids de usuário RH). Chave do titular
  `candidatura_id`, ligação via `candidaturas`.
- **Implementa:** 44-11.

### BD-10 · `retencao_hold` ENTRA só com o fato e a base

- **Autoria:** OPERADOR (2026-10-06).
- **Decisão:** o titular tem direito de saber QUE há retenção e sob qual base; não ao raciocínio
  interno do RH.
- **Efeito na cópia:** entram `motivo` (vocabulário fixo do CHECK `ck_retencao_hold_motivo`),
  `criado_em`, `liberado_em`; ficam fora, com razão nomeada, `detalhe` (texto livre do RH, pode
  conter estratégia de litígio), `criado_por` e `liberado_por`. Chave `candidatura_id`.
- **Implementa:** 44-11.

### BD-11 · `purga_execucao_itens` FICA FORA

- **Autoria:** OPERADOR (2026-10-06).
- **Decisão:** telemetria operacional da purga. O titular purgado não existe mais para pedir
  cópia, e para titular vivo só há linhas de ensaio.
- **Efeito na cópia:** tabela excluída com razão nomeada.
- **Implementa:** 44-11.

### BD-12 · `purga_execucoes`, `config_purga`, `config_janela_exclusao` FICAM FORA — condicionado

- **Autoria:** OPERADOR (2026-10-06).
- **Decisão:** fora com razão nomeada, **CONDICIONADO à medição** de que nenhuma das três carrega
  chave do titular. Se alguma carregar, o executor PARA e devolve checkpoint, sem decidir.
- **Efeito na cópia:** três tabelas excluídas com razão nomeada (se a condição se confirmar).
- **Implementa:** 44-11.

### BD-13 · as 9 colunas — autoria MISTA, item a item

- **(i) Autoria: ORQUESTRADOR** (inclinação padrão do prompt de planejamento, não perguntada ao
  operador). Fatos do próprio pedido do titular ENTRAM: `solicitacoes_dados.cancelado_em`,
  `solicitacoes_dados.executar_em`, `candidaturas.encerrada_a_pedido_em` — os três que a
  verificação de 2026-10-06 apontou como omitidos da cópia.
- **(ii) Autoria: ORQUESTRADOR** (idem, apoiado na dica do `deferred-items.md` da Phase 48).
  `solicitacoes_dados.plano` FICA FORA: jsonb interno do motor da Phase 45.
- **(iii) Autoria: PLANEJADOR.** `candidatos.faixa_etaria_materializada` ENTRA. Razão: é dado
  DERIVADO da pessoa (faixa calculada de `data_nascimento`, que já está na cópia), mantido pelo
  sistema inclusive depois da anonimização para a auditoria de viés — e dado derivado do titular é
  dado do titular sob o Art. 18, II quando nenhuma razão nomeada o exclui.
- **(iv) Autoria: OPERADOR**, respondido em 2026-10-06 por AskUserQuestion do orquestrador DEPOIS
  do planejamento, porque (i) e o precedente do 48-17 puxavam para lados opostos. Resposta
  verbatim: **«3 carimbos entram; recibo fora (Recommended)»** = option-a.
  `solicitacoes_dados.storage_concluido_em`, `postgres_concluido_em` e `auth_concluido_em` ENTRAM;
  `solicitacoes_dados.recibo_enviado_em` FICA FORA (mesma família de `aviso_*_enviado_em`, 48-17).
- **Implementa:** 44-11.

### BD-14 · portão «Universo do banco + smoke»

- **Autoria:** OPERADOR (2026-10-06).
- **Decisão:** o universo de TABELAS do drift do export é o banco vivo
  (`information_schema.tables`, `public`, `BASE TABLE`, medido na execução), e o mesmo predicado
  existe como smoke que falha alto (`supabase/tests/p44_export_drift_smoke.sql`,
  `RAISE EXCEPTION 'P44-DRIFT FAIL …'`). **Cadência MANUAL aceita** — e escrita como override,
  abaixo, não como limitação silenciosa.
- **Efeito na cópia:** nenhum direto; é o portão que impede a próxima tabela/coluna de ficar fora
  da cópia em silêncio.
- **Implementa:** 44-10 (relatório `05-export-allowlist-drift.sql` reescrito, smoke novo, lembrete
  no `p46apply.cjs migrate`).

### Override pronto para o verificador (cadência manual do portão do SC#3)

```yaml
overrides:
  - must_have: "O portão do SC#3 que vê o banco (drift do export: universo de tabelas e colunas = catálogo vivo de public) roda de forma recorrente/automática"
    reason: "O operador escolheu cadência MANUAL (BD-14, 2026-10-06). O que a torna aceitável: o universo de tabelas agora é o banco medido na execução (não o artefato nem o snapshot de 2026-08-04), e o smoke supabase/tests/p44_export_drift_smoke.sql FALHA ALTO (RAISE EXCEPTION 'P44-DRIFT FAIL …', inclusive em população vazia) — foi visto reprovando contra o drift real de PROD em 2026-10-06 (44-10). Obrigação de execução: rodar `node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql` depois de todo apply que crie, renomeie ou remova tabela ou coluna em public, e antes de toda regeração da allowlist; o `p46apply.cjs migrate` imprime esse lembrete sempre que a migration contém CREATE/ALTER/DROP TABLE."
    accepted_by: "operador (Fernando) — via pergunta do orquestrador (AskUserQuestion) em 2026-10-06, opção «Universo do banco + smoke»"
    accepted_at: "2026-10-06"
```

O mesmo bloco está, verbatim, em `44-10-SUMMARY.md` §«Override para o re-verificador (BD-14)»; o
44-13 o lista de novo entre as pendências do verificador.

## Adendo 2026-10-06 (noite) — fechamento do CR-01: decisões

A reverificação pós-G5 (`44-VERIFICATION.md`, 21:33Z, gaps_found 6/7) reprovou a fase por um
único gap: a frase `COPY_PEDIR_COPIA.oQueNaoEsta` (`exportacaoService.ts`), entregue no `.html`
e no `.json` (`o_que_nao_esta_nesta_copia`), diz que só fica de fora telemetria técnica — falso
sob a allowlist 1.4.0. Autoria marcada como no adendo anterior.

### BD-15 · escopo da rodada de fechamento: CR-01 + portões

- **Autoria:** OPERADOR (AskUserQuestion do orquestrador do `/gsd-plan-phase 44 --gaps`,
  2026-10-06). Resposta: **«CR-01 + portões (Recommended)»**.
- **Entra:** CR-01 (frase reescrita com as categorias reais retidas + canal de contato; teste que
  prende cada família de razão de `colunas_excluidas`/`excluidas` do artefato a uma cláusula da
  frase; atualização do contrato de copy na `44-UI-SPEC.md`; publicação SÓ do front com o
  marcador novo conferido no chunk publicado e `git log origin/main..HEAD` vazio) e o
  endurecimento dos portões: **WR-01** (a (k) conta tuplas com regex permissiva e exige
  igualdade com a rígida), **WR-02** (asserção estrutural sobre o smoke: o `RAISE EXCEPTION
  'P44-DRIFT FAIL` e o predicado não podem sumir calados), **WR-03** (o `DO $gate$` falha FECHADO
  em chave ausente/NULL — `coalesce`/`IS DISTINCT FROM`), **WR-07** (a (i2) compara com a mesma
  ordenação que o gerador emite; fixture ganha nomes com prefixo comum, ex. `decisao_final` /
  `decisao_final_historico`). Cada portão endurecido tem de ser **visto mordendo** depois do
  conserto (CLAUDE.md §Portões).
- **Fica fora (segue `open` em `44-REVIEW-DISPOSITION.md`):** WR-04, WR-05 (GRANT SELECT por
  coluna em PROD — fase própria), IN-01..IN-07.
- **Nenhuma escrita em PROD de banco nem redeploy de EF nesta rodada:** a frase nasce em
  `exportacaoService` (front); a allowlist 1.4.0 NÃO muda.

### BD-16 · `solicitacoes_dados.plano` FICA FORA — agora por decisão do operador (fecha WR-06)

- **Autoria:** OPERADOR (mesma pergunta, 2026-10-06). Resposta: **«Fica fora, frase nomeia
  (Recommended)»**. Substitui a autoria ORQUESTRADOR do BD-13 (ii); o efeito no artefato é o mesmo.
- **Efeito:** allowlist 1.4.0 inalterada; a nova `oQueNaoEsta` NOMEIA a categoria («a ficha
  técnica do motor de exclusão sobre o seu pedido»). O artefato pode registrar a nova autoria no
  texto da razão SÓ se isso não exigir mudar versão/EF — caso contrário, a autoria fica só aqui.

### BD-17 · a frase nomeia, não esconde, o que segue em aberto

- **Autoria:** PLANEJADOR do orquestrador (derivado do veredito do verificador, §Gaps item 3).
- **Decisão:** a frase declara TODA categoria retida, inclusive as que dependem de política ainda
  em aberto (texto da justificativa da decisão final — BD-9 antigo «EM ABERTO»). Categorias
  mínimas, da redação sugerida em `44-REVIEW.md` §CR-01: identificação de quem da equipe agiu;
  anotações internas da equipe sobre conservação além do prazo (o motivo e as datas entram);
  a ficha técnica do motor de exclusão; o texto da justificativa da decisão final; telemetria
  técnica das ferramentas; com canal de contato para pedir o que não veio.
- **Prova:** o teste do CR-01 deriva as famílias do ARTEFATO (não de lista literal), para que o
  próximo veto não suba sem atualizar a frase (CLAUDE.md §Portões — iteração sobre lista literal
  não reprova nada).
