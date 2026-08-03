# Phase 43: Consentimentos Honestos & Política de Retenção - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo) — as três decisões de negócio que o ROADMAP marcava como
bloqueantes desta fase foram levadas ao operador e **respondidas**, não presumidas.

<domain>
## Phase Boundary

Cada checkbox que o candidato marca passa a ter consequência real, e o prazo de validade do dado
existe como configuração alterável sem deploy — **sem que nada seja apagado ainda**.

**Propriedade que torna esta fase segura de executar cedo: ZERO AÇÃO DESTRUTIVA POR DESENHO.**
Nenhum `DELETE`, nenhum `DROP`, nenhum predicado de purga ligado. O portão de fase destrutiva
**não se aplica** aqui — e é justamente por isso que a matriz de retenção pode nascer nesta fase
sem risco: ela nasce como **dado**, e só passa a morder na Phase 46.

Requirements: CONSENT-01..06, RETEN-01, RETEN-02, RETEN-03, RETEN-04, RETEN-06 (11).
`RETEN-05` **não** está aqui (a linha nasce aqui, mas o requirement só é observável quando a purga
executa → Phase 46).

</domain>

<decisions>
## Implementation Decisions

### Decididas pelo operador em 2026-08-01 (eram bloqueantes; NÃO reabrir sem ele)

**BD-1 · Janela de retenção — semear TUDO no teto de 2 anos.**
Todos os estados da candidatura nascem com 2 anos. Razões, na ordem que importa:
1. **2 anos é o teto já consentido pela copy do cadastro** — não é recomendação técnica, é o que o
   candidato leu e aceitou. O ROADMAP exige que o seed seja documentado exatamente assim.
2. **Retenção mais longa nunca apaga cedo demais.** Um seed curto seria a única forma de esta fase
   causar dano, e ela é declaradamente zero-destrutiva.
3. **O número fino por estado precisa de advogado trabalhista, e só morde na Phase 46.** A Phase 43
   entrega o MECANISMO (RETEN-02: alterável por admin sem deploy). O parecer jurídico é
   **pré-requisito da Phase 46**, não desta.

⚠ **Consequência que o plano tem de carregar adiante:** a Phase 46 NÃO pode ligar a purga com a
matriz ainda no seed genérico sem que o operador confirme os prazos por estado. Registrar isso
como dependência explícita da 46, não como lembrete em prosa.

**BD-2 · `autorizacao_analise_video` — PARAR DE COLETAR.**
Sai do formulário e da copy. O sistema não tem análise de vídeo; pedir permissão para algo que não
se faz é exatamente a promessa órfã que o SC#3 manda eliminar.
**A COLUNA PERMANECE.** Dropar coluna é ação destrutiva e esta fase é zero-destrutiva por desenho.
Os valores históricos ficam intactos, com `COMMENT` explicando por que a coluna existe e não é mais
alimentada. O eventual `DROP` é decisão da **Phase 47**, junto com o zumbi `data_deletion_log`
(CONSOL-03), onde já existe portão destrutivo previsto.

**BD-3 · Rótulo do Art. 20 — REESCREVER EM LINGUAGEM SIMPLES.**
"revisão por pessoa natural" → linguagem que o candidato decodifica (ex.: "Pedir que uma pessoa
revise esta decisão"), **mantendo a citação do Art. 20 ao lado**. Um direito só é exercível na
medida em que o titular entende que ele existe; juridiquês é fricção sobre um direito.
**Três sítios vivos**, todos vistos pelo candidato ou pelo RH:
- `src/features/explicacao/components/SolicitarRevisaoCTA.tsx:47` (`cta:`)
- `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx:46`
- `src/features/decisao/components/RegistrarDecisaoForm.tsx:189` (texto para o RH)
Os testes correspondentes pinam as strings — `SolicitarRevisaoCTA.test.tsx:35` e
`ExplicacaoCandidatoPage.test.tsx:138` — então a mudança aparece no diff em vez de escorregar.

### Claude's Discretion

Tudo o mais: forma da matriz de retenção, estrutura da tabela de config, desenho da superfície de
revogação, mecânica de versão+hash do texto de consentimento. Guiar-se pelo ROADMAP, pelos
critérios de sucesso e pelas convenções vivas do repositório.

</decisions>

<code_context>
## Existing Code Insights

Medido no repositório em 2026-08-01, antes de qualquer planejamento.

**O `.default(true)` que o SC#1 acusa é real, e são TRÊS colunas:**
`src/features/cadastro/schemas/candidatoSchema.ts`
- `:355` `autorizacao_uso_dados: z.literal(true, …)` — obrigatório, é o gate de submit (D-15)
- `:360` `autorizacao_comunicacao: z.boolean().default(true)` ← **desmarcar por padrão**
- `:361` `autorizacao_retencao_curriculo: z.boolean().default(true)` ← **desmarcar por padrão**
- `:362` `autorizacao_analise_video: z.boolean().default(false)` ← **remover da coleta (BD-2)**

Os mesmos defaults estão duplicados em
`src/features/cadastro/components/CadastroMultiStepForm.tsx:245-248` — **dois sítios**, e mexer num
sem o outro deixa o formulário inconsistente com o schema.

**TODOS os consentimentos opcionais são órfãos hoje.** `grep` em `src/` e `supabase/functions/`
(excluindo testes) não encontra NENHUM consumidor de `autorizacao_comunicacao`,
`autorizacao_retencao_curriculo` ou `autorizacao_analise_video` fora do próprio formulário de
cadastro. Só `autorizacao_uso_dados` tem consumidor real, e é o gate de submit
(`CadastroMultiStepForm.tsx:411`). Isto é o achado central da fase: a fase não está "melhorando"
consentimentos que funcionam — está dando **primeiro consumidor** a três flags que nunca foram
lidas.

**`preferencias_notificacoes` tem de ser INSPECIONADA antes de projetar opt-out** (nota de escopo
do ROADMAP, achado incidental do FK-AUDIT). Pode ser reuso, não tabela nova.

**`retain_until` já existe vivo em `ai_call_logs`** — o SC#4 exige veredito registrado sobre
reusar ou não esse padrão **antes** de a estrutura nova existir.

**Superfície do RH e do candidato já construídas na Phase 42** (fila `/rh/revisoes`, painel do
candidato com resultado da revisão) são o vizinho estilístico da superfície de revogação nova.

</code_context>

<specifics>
## Specific Ideas

- O seed de 2 anos precisa estar documentado **como teto já consentido pela copy**, não como
  recomendação técnica — o ROADMAP faz disso critério de sucesso, não preferência editorial.
- A revogação de marketing tem de ser provada por **envio real bloqueado**, não por leitura de
  flag (SC#2). Isso implica que o consumidor do consentimento vive no caminho de envio.
- O transacional **segue sem opt-out** sob o Art. 7º, V — decisão travada no M7 e explicitamente
  preservada. Não reabrir.
- `autorizacao_retencao_curriculo` ganha seu primeiro consumidor real: aparece por candidato como
  a base legal citada da retenção do currículo (SC#5).
- Click tracking do Resend **desligado e verificado no provedor** (SC#3) — verificação no painel do
  Resend, não só no código.

</specifics>

<deferred>
## Deferred Ideas

- Número fino de retenção por estado → **Phase 46**, com parecer jurídico como pré-requisito.
- `DROP` da coluna `autorizacao_analise_video` → **Phase 47** (CONSOL-03), sob portão destrutivo.
- `RETEN-05` (retenção de `notificacoes_enviadas`) → **Phase 46**, por já ser `DELETE` por cron.

</deferred>

---

## Adendo pós-pesquisa — medições de PROD e 2 decisões do operador (2026-08-01)

A pesquisa levantou um **bloqueio de medição** (A1) e dois achados colaterais que exigiam decisão.
Todos resolvidos aqui, antes do planejamento. Os números são medidos, não estimados.

### A1 · RESOLVIDO — as policies de `autorizacoes` EXISTEM em PROD

`docs/RLS_POLICIES.md:158-162` afirmava UPDATE own-row sem que o DDL estivesse em
`supabase/migrations/`. Medido em `pg_policies`: **as 3 policies existem**, RLS ligada.

| policy | cmd | escopo |
|---|---|---|
| `Candidatos podem ler suas autorizacoes` | SELECT | own-row via `candidatos.user_id = auth.uid()` |
| `RH pode ler todas as autorizacoes` | SELECT | RH ativo |
| `Candidatos podem atualizar suas autorizacoes` | **UPDATE** | own-row, com `qual` **e** `with_check` |

**Consequência para o plano — o ramo mais barato está aberto:** a revogação do CONSENT-04 é
**escrita own-row direta**, não precisa de RPC `SECURITY DEFINER`. O `with_check` presente impede
que o candidato reaponte a linha para outro `candidato_id`.

⚠ **E é uma QUARTA instância do drift em aberto.** As 3 policies vivem em PROD e em **nenhum
arquivo de migration** — DDL fora do ledger, que um `db reset` perderia em silêncio. Registrar em
`processo-origem-do-drift-desconhecida`; **não** tentar "corrigir" reaplicando por migration nesta
fase sem medir o `pg_get_expr` vivo primeiro (a lição do 42-07: o arquivo não é o objeto vivo).

### BD-4 · Consentimento faltante — **CORRIGIR NESTA FASE** (decisão do operador)

**Medido:** 21 candidatos vivos · **4 sem nenhuma linha em `autorizacoes` (19%)** · 17 linhas, todas
com `policy_version` preenchida.

O `INSERT` em `cadastrar-candidato/index.ts:307-312` é **best-effort**: falhou, o cadastro conclui
mesmo assim e ninguém fica sabendo. Não é hipótese — já aconteceu 4 vezes.

**Decisão:** tornar a gravação **fail-closed** — o consentimento entra na mesma transação do
cadastro, ou o cadastro não conclui. Numa tabela cuja natureza declarada é **prova probatória**,
19% de linhas ausentes torna a fase inteira menos defensável.

**NÃO fazer backfill dos 4.** Consentimento retroativo é **fabricar prova** — o oposto exato do que
esta fase entrega. Os 4 permanecem sem linha, e essa ausência é ela própria o registro honesto.

### BD-5 · Base histórica e marketing — **NULL = NÃO AUTORIZADO** (decisão do operador)

`autorizacao_marketing_vagas` nasce NULL para toda a base histórica, e NULL é tratado como não
autorizado. **Nenhum candidato já cadastrado poderá receber divulgação de vagas.**

**Isto não é regressão — é a correção**, e o plano tem de declará-lo em voz alta em vez de deixar
alguém descobrir por métrica caindo. Ninguém nunca consentiu marketing separadamente, porque o
consentimento separado não existia. Herdar de `autorizacao_comunicacao` seria reconstruir
consentimento por **inferência** — precisamente o que o `.default(true)` fazia e o que esta fase
existe para eliminar.

### Correções que a pesquisa fez ao meu próprio contexto

- **A tabela é `public.autorizacoes`, não `candidatos`.** O bloco `<code_context>` acima e o
  ROADMAP falam de colunas em `candidatos`; a tabela real já tem `policy_version`, `ip_aceite`,
  `user_agent_aceite`. **A pesquisa tem precedência sobre o meu levantamento inicial.**
- **Os sítios de `.default(true)` são NOVE, não dois — e os que decidem são do SERVIDOR**
  (`_shared/schemas.ts:102-104` e `cadastrar-candidato/index.ts:293-297` com `?? true`). Mexer só
  no client entrega o checkbox desmarcado **e o banco gravando `true`** — o pior resultado possível,
  porque *parece* corrigido.
