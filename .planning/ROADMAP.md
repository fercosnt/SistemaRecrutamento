# Roadmap: Sistema de Recrutamento Beauty Smile

## Milestones

- ✅ **v1.0 — M1 MVP Candidato** — Phases 1–5 (shipped 2026-06-06) — `milestones/v1.0-ROADMAP.md`
- ✅ **v2.0 — M2 Funil RH + Avaliação por IA** — Phases 6–16 (shipped 2026-06-26) — `milestones/v2.0-ROADMAP.md`
- 🔧 **Standalone (pós-v2.0)** — Phase 17 (Navegação & Arquitetura de Informação) — mini-fase fora de milestone (shipped 2026-06-28)
- ✅ **v3.0 — M3 Refinamento RH & Hardening** — Phases 18–21 (shipped 2026-06-30) — `milestones/v3.0-ROADMAP.md`
- ✅ **v4.0 — M4 Correção & Blindagem do Funil** — Phases 22–27 (shipped 2026-07-13) — `milestones/v4.0-ROADMAP.md`
- ✅ **v5.0 — M5 Gestão de Usuários & Perfil RH** — Phases 28–30 (shipped 2026-07-14) — `milestones/v5.0-ROADMAP.md`
- ✅ **v6.0 — M6 Operação do Funil RH** — Phases 31–35 (shipped 2026-07-17) — `milestones/v6.0-ROADMAP.md`
- ✅ **v7.0 — M7 Comunicação com o Candidato (COMM)** — Phases 36–41 (shipped 2026-07-28) — `milestones/v7.0-ROADMAP.md`
- 🚧 **v8.0 — M8 Dados do Candidato & Direitos do Titular (LGPD-OPS)** — Phases 42–47 (aberto 2026-07-29) — 52 requirements

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

A numeração do M8 **continua** a partir da **Phase 42** (o M7 terminou na Phase 41). Não reinicia.

### v8.0 — M8 Dados do Candidato & Direitos do Titular (LGPD-OPS)

- [ ] **Phase 42: Inventário, Gates & Fila Art. 20** - O RH passa a ver e responder os pedidos de revisão que hoje caem no vazio; o mapa do que existe (PII, backup, crons, drift) fica em cima da mesa antes de qualquer linha destrutiva
- [ ] **Phase 43: Consentimentos Honestos & Política de Retenção** - Cada checkbox que o candidato marca ganha consequência real, e o prazo de validade do dado passa a existir como configuração alterável sem deploy — zero ação destrutiva
- [ ] **Phase 44: Exportação & Acesso** - O candidato recebe uma cópia honesta dos próprios dados, e o inventário de PII que a fase irreversível vai consumir nasce exercitado em produção
- [ ] **Phase 45: Motor de Exclusão & Anonimização** ⚠️ **FASE DE MAIOR RISCO** - O pedido de exclusão executa de verdade — Storage → Postgres → Auth, irreversível, sem levar junto a trilha de decisão humana
- [ ] **Phase 46: Purga Automática (dry-run → live)** - O dado expira sozinho dentro de um cerco, e a primeira coisa que a purga faz em produção é não apagar nada
- [ ] **Phase 47: Transparência & Consolidação** - O que o sistema faz com o dado está escrito onde o candidato lê, e nenhuma promessa de compliance sobrevive sem código que a execute

### Ordem de execução, dependências e paralelização

```
42 ──► 43 ──► 44 ──► 45 ──► 46
                                └──► 47  (lateralmente paralelizável com 46)
```

- **Cadeia estrita 44 → 45 → 46.** O inventário do export **é** o plano de exclusão (restrição dura #4); e cabear um cron a um motor destrutivo não provado é como um bug vira incidente.
- **43 → 44 é preferencialmente sequencial, não obrigatório.** CONSENT-02 adiciona colunas a `candidatos`, e EXPORT-04 (snapshot das chaves do export) é exatamente o mecanismo que detecta coluna nova. Rodar em paralelo faz o snapshot ficar vermelho **por desenho** e exige um round de reconciliação. Se o operador aceitar esse custo, 43 ∥ 44 comprime o caminho crítico em uma fase.
- **47 ∥ 46** — sem arquivos compartilhados. TRANSP-02 depende da matriz de retenção (Phase 43), não da purga; CONSOL não depende de 46.
- **42 é pré-requisito de todas.** INVENT-04 (varredura `ADD COLUMN IF NOT EXISTS`) precede CONSENT-02, que adiciona colunas exatamente à tabela onde o drift de FK vive (`candidatos.user_id`).

### Restrições de ordenação — irreversíveis se violadas

Documentadas no topo de `REQUIREMENTS.md`. Onde cada uma é honrada neste roadmap:

| # | Restrição | Onde é honrada |
|---|-----------|----------------|
| 1 | **ERASE-01 (snapshot de bias com faixa etária materializada) ANTES de qualquer anonimização** — `gerar_bias_snapshot()` faz join na `candidatos.data_nascimento` viva; anonimizar antes corrompe a série EEOC 4/5 **permanentemente** | Phase 45, **intra-fase**: ERASE-01 é a primeira wave e tem de estar provado antes de ERASE-02 tocar qualquer linha real. Encodado como must-have de plano, não como sequência implícita |
| 2 | **Storage ANTES do `deleteUser` do Auth** (ERASE-03) — imposição de plataforma, não preferência: o Supabase recusa apagar usuário que possua objetos no Storage | Phase 45, ordem fixa `Storage → Postgres → Auth`, idempotente em cada passo |
| 3 | **Prova de consentimento não é retroativa** (CONSENT-02) — a janela fecha a cada novo cadastro | Phase 43 (2ª fase do milestone). Fica antes de EXPORT/ERASE e dentro do milestone, satisfazendo a restrição |
| 4 | **EXPORT completo ANTES do motor de exclusão** | Phase 44 → Phase 45, cadeia estrita |

### Portão de fase destrutiva (exit criterion de ROADMAP, não conselho)

> **Precedente que justifica isto:** a P39 — a fase de maior risco do M7 — fechou **sem `VERIFICATION.md` e sem code review**, e 2 defeitos **CRÍTICOS** chegaram a produção. Cada camada de verificação aplicada depois achou algo que a anterior não pegou. O M8 tem uma feature central **irreversível**; aqui o mesmo erro não é recuperável.

Toda fase que escreva um `DELETE`/`UPDATE` destrutivo, altere um predicado de purga vivo, ou faça `DROP` de objeto com escritor vivo **só fecha** com os 5 itens abaixo. Não são opcionais e não são substituíveis por "o smoke passou":

1. **`VERIFICATION.md` presente e com veredito.** Nunca ausente, nunca `status: draft`.
2. **Code review bloqueante ANTES do apply em PROD**, não depois. (`/gsd-code-review`)
3. **Asserções negativas obrigatórias** — o que **NÃO** aconteceu: linhas que deviam sobreviver sobreviveram, contagem fora do escopo inalterada, trilha de auditoria intacta, nenhuma FK relaxada. Um teste que só prova que algo sumiu não prova que a coisa certa sumiu.
4. **Zero `--no-verify`** em commits da fase. O baseline `tsc` de 97 (teto CI 104) é conhecido; se o hook barrar, corrigir o hook — o bypass reflexivo é a origem cultural do que a P39 permitiu.
5. **Dry-run/rollback exercitado contra dados de forma viva** antes de qualquer execução real, com o relatório do dry-run gerado pela **mesma query** do delete real.

**Fases sujeitas ao portão:** **45** (integral) · **46** (integral) · **42** (só INVENT-05 — edita o predicado de um `DELETE` cron vivo) · **47** (só CONSOL-03 — `DROP` de tabela com escritor vivo).

### Restrições de ambiente que atravessam todas as fases

- 🔴 **Subagentes GSD não recebem os tools MCP do Supabase** (bug upstream). **Toda** migration, inspeção em PROD e deploy de Edge Function é **checkpoint do orquestrador/main thread** — nunca trabalho autônomo do executor. Toda fase abaixo carrega trabalho de DB ou EF; planejar as waves assumindo isso desde o início, não descobrir no meio.
- Migrations chegam a PROD via Supabase MCP `apply_migration` (o `db push` do CLI bate SQLSTATE 42601 em corpos PL/pgSQL `$$`). **Reconciliar o ledger após cada apply.**
- **Zero dependências npm novas** e **zero extensões Postgres novas.** `pg_cron` 1.6.4, `pg_net` 0.19.5, `pgcrypto` 1.3, `supabase_vault` 0.3.1 estão vivas e com versão confirmada. A extensão `anon` está **ausente do catálogo** (não-instalável) — o primitivo de anonimização é tombstone `UPDATE` in-place via RPC `SECURITY DEFINER`.
- **`FK-AUDIT-LIVE.md` tem precedência** sobre `STACK.md`/`ARCHITECTURE.md` em qualquer questão de `ON DELETE` ou estado de schema. Aqueles leram arquivos de migration; aquele é `pg_constraint`.

## Phase Details

### Phase 42: Inventário, Gates & Fila Art. 20

**Goal**: O RH vê e responde os pedidos de revisão que hoje caem no vazio — e nenhuma linha destrutiva do milestone é escrita antes de o mapa do que existe (PII coluna-a-coluna, backup, crons vivos, drift de FK) estar em cima da mesa como fato datado.
**Depends on**: Nada (primeira fase do M8). Consome o pipeline COMM do M7 como fundação já paga.
**Requirements**: INVENT-01, INVENT-02, INVENT-03, INVENT-04, INVENT-05, REVISAO-01, REVISAO-02, REVISAO-03, REVISAO-04, REVISAO-05, REVISAO-06
**Success Criteria** (o que tem de ser VERDADE):

  1. Um pedido de revisão feito por um candidato aparece numa fila do RH ordenada por antiguidade, com badge de SLA **interno** (nunca exibido ao candidato), e o RH é notificado por e-mail — hoje esse pedido grava um timestamp que ninguém lê.
  2. Quando o RH registra o resultado da revisão por write-path auditável único, o candidato recebe e-mail avisando que sua revisão foi respondida (5º evento do pipeline COMM) e vê o resultado no painel.
  3. Quem registrou a decisão original tenta responder à revisão dela e é **barrado pelo servidor** — provado por tentativa real com JWT impersonado, não por aviso de UI.
  4. Existe um artefato datado, no repositório, que responde: quantos pedidos de revisão já estão pendentes em PROD hoje (**entregue antes de qualquer tela**); qual coluna guarda qual PII e se ela deve ser apagada / anonimizada / preservada (semeado de `FK-AUDIT-LIVE.md`, nunca de arquivos de migration); se o PITR está ligado e com que janela — **com o registro explícito de que Storage não é coberto por nenhum caminho de backup**; e o diff dos `cron.job` vivos contra o repositório, cada job vivo rastreável a uma migration.
  5. O `ai-logs-retention-cleanup` que roda todo dia às 02:00 apaga as linhas que deve apagar — hoje o `NOT IN` com subquery NULL-able pode fazê-lo apagar **zero em silêncio** — e a varredura do idioma `ADD COLUMN IF NOT EXISTS` listou toda migration onde uma cláusula FK foi silenciada (causa identificada do drift `candidatos.user_id`).

**Plans**: 12 plans (5 waves · 11/11 requirements cobertos · 21/21 decisões do CONTEXT com plano implementador)

Plans:

- [x] 42-01-PLAN.md — Wave 0: `.husky/pre-commit` convertido em gate de não-regressão (baseline 97) + testes de paridade do vocabulário de evento e não-regressão W-01 dos 4 eventos vivos
- [x] 42-02-PLAN.md — REVISAO-06: `docs/compliance/` + o passivo Art. 20 medido e datado, **antes de qualquer tela**
- [x] 42-03-PLAN.md — Wave 0: módulos puros da feature (classificador de faixa total, contrato de erro, allowlist de colunas) + o smoke SQL de 8 asserções como espec RED
- [x] 42-04-PLAN.md — INVENT-01: inventário PII coluna-a-coluna do catálogo vivo (YAML + Markdown gerado) e a correção da citação da semente FK-AUDIT-LIVE
- [x] 42-05-PLAN.md — INVENT-02/03/04: PITR e Storage sem backup · diff dos `cron.job` vivos × repositório · varredura do idioma condicional de `ADD COLUMN` · achados de autorização registrados
- [x] 42-06-PLAN.md — **TRACER**: migration `p42_revisao_art20` (colunas, CHECKs, RPC de escrita com o guard reviewer ≠ decider, RPC de leitura com escopo, tabela de config do SLA) provada por impersonação real de dois RHs
- [x] 42-07-PLAN.md — REVISAO-01: EF nova `notificar-rh` + trigger de disparo, com a colisão entre o ledger compartilhado e a varredura de retry viva fechada explicitamente ⚠ **código completo e verde; apply/deploy/smoke em PROD PENDENTES — REVISAO-01 segue aberto**
- [x] 42-08-PLAN.md — REVISAO-04: 5º evento `revisao_respondida` (os 9 sítios em código + o CHECK vivo + o trigger), na ordem obrigatória EF → CHECK → trigger
- [x] 42-09-PLAN.md — REVISAO-02: fila `/rh/revisoes` (serviço, hooks, tabela, badges, página, rota com `RoleGuard`)
- [x] 42-10-PLAN.md — REVISAO-03/05 na interface: diálogo de resposta com confirmação aninhada e alerta inline de recusa + entrada e contador na `RHSidebar` (três sítios)
- [x] 42-11-PLAN.md — REVISAO-04 no painel do candidato: bloco de resultado da revisão + terceiro estado da chamada de ação
- [x] 42-12-PLAN.md — INVENT-05 (**portão destrutivo**): correção do predicado do `ai-logs-retention-cleanup`, isolado, medido antes/depois pela mesma query, com review bloqueante e zero bypass do hook

**Waves**: 1 → (42-01, 42-02, 42-03) · 2 → (42-04, 42-05, 42-06) · 3 → (42-07, 42-09, 42-11) · 4 → (42-08, 42-10) · 5 → (42-12)
**UI hint**: yes — REVISAO-02 é uma superfície RH net-new (fila + badge de SLA), desktop-first
**Security**: candidata a `/gsd-secure-phase` — REVISAO-05 é autorização server-enforced e REVISAO-01 introduz uma EF nova (`notificar-rh`) com resolução de destinatário distinta da candidate-hard-wired
**Portão destrutivo**: aplica-se **só a INVENT-05** — é a única edição destrutiva de uma fase read-only. Blast radius hoje é zero (`ai_call_logs` tem 0 linhas), mas o efeito da correção é fazer um `DELETE` vivo passar a apagar de verdade
**⚠ Risco nomeado**: REVISAO-04 exige **uma edição cirúrgica na EF `notificar-candidato` viva** — vocabulário de evento fechado em dois lugares (uma union em código **e** um CHECK constraint vivo no banco). É **o mesmo arquivo que já embarcou dois defeitos CRÍTICOS em produção** (P39 CR-01/CR-02). Tratar como mudança de alto risco: diff mínimo, review bloqueante, e a prova de que os 4 eventos existentes continuam ramificando corretamente (o defeito W-01 — preheader não ramificado — era invisível a asserções que olham só o texto visível)

### Phase 43: Consentimentos Honestos & Política de Retenção

**Goal**: Cada checkbox que o candidato marca passa a ter consequência real, e o prazo de validade do dado existe como configuração alterável sem deploy — tudo isso **sem que nada seja apagado ainda**.
**Depends on**: Phase 42 (INVENT-04 precede a migration que adiciona colunas a `candidatos`; o inventário PII de INVENT-01 informa o que a matriz de retenção cobre)
**Requirements**: CONSENT-01, CONSENT-02, CONSENT-03, CONSENT-04, CONSENT-05, CONSENT-06, RETEN-01, RETEN-02, RETEN-03, RETEN-04, RETEN-06
**Success Criteria** (o que tem de ser VERDADE):

  1. Um novo candidato encontra os consentimentos opcionais **desmarcados**, e ao marcar o sistema grava **qual texto ele leu** (versão + hash + timestamp) — hoje o `.default(true)` torna "marcou" indistinguível de "não desmarcou", e candidatos pré/pós-enforcement passam a ser separáveis por **dado**, não por inferência.
  2. "Andamento do processo seletivo" e "novas oportunidades de vagas" são **dois consentimentos distintos**; o candidato revoga o de marketing pelo painel e o envio de marketing para de acontecer — provado por envio real bloqueado, não por leitura de flag. O transacional segue sem opt-out sob o Art. 7º, V (decisão travada no M7, preservada).
  3. `autorizacao_analise_video` deixou de ser promessa órfã — foi honrada ou removida, não continua coletada e nunca lida — e clicar num link de e-mail transacional não é mais rastreado (click tracking desligado no Resend, verificado no provedor).
  4. Um administrador altera a janela de retenção de um estado da candidatura **sem deploy**, com o seed de 2 anos documentado como *teto já consentido pela copy do cadastro* e não como recomendação técnica; e a decisão de reusar (ou não) o padrão `retain_until` já vivo em `ai_call_logs` está registrada **com veredito antes** de a estrutura nova existir.
  5. Uma prévia **read-only** responde "estes N candidatos seriam purgados" sem executar nada, e `autorizacao_retencao_curriculo` aparece por candidato como a base legal citada da retenção do currículo — o primeiro consumidor real de um consentimento até hoje órfão.

**Plans**: 9 plans (6 waves — a wave 4 é o checkpoint de PROD do orquestrador, e as duas telas novas dependem dele porque não compilam contra tipos antigos)

Plans:

- [x] 43-01-PLAN.md — TRACER: texto de consentimento em fonte única → hash SHA-256 no servidor → EF fail-closed → colunas de prova (migration `20260801000001`)
- [x] 43-02-PLAN.md — Veredito do RETEN-06 antes da estrutura + copy do Art. 20 em linguagem simples (BD-3) + portão de grep de copy com escopo duplo
- [x] 43-03-PLAN.md — `AutorizacoesStep` reescrito e os 6 sítios de default do cliente: nada nasce marcado, nada pede análise de vídeo
- [x] 43-04-PLAN.md — Matriz de retenção por estado (seed 24 meses = teto consentido) + RPC de escrita auditada na mesma transação (migration `20260801000002`)
- [x] 43-05-PLAN.md — Guard de marketing no `BEFORE INSERT` do ledger de notificações + escopo honesto do SC#2 e declaração BD-5 (migration `20260801000003`)
- [x] 43-06-PLAN.md — Predicado único de retenção + prévia agregada com gate de não-divergência por md5 (migration `20260801000004`)
- [x] 43-07-PLAN.md — **CHECKPOINT do orquestrador**: apply das 4 migrations na ordem + reparo de ledger + md5 + 4 smokes + deploy da EF (depois das colunas) + `db:types` + CONSENT-06 no Resend
- [x] 43-08-PLAN.md — `/candidato/privacidade`: revogação own-row sem fricção + guarda do currículo como base legal citada
- [x] 43-09-PLAN.md — `/admin/retencao`: matriz editável sem deploy + diálogo com teto server-enforced + prévia read-only

**UI hint**: yes — `AutorizacoesStep` (copy + defaults) e uma superfície nova de revogação no painel do candidato, mobile-first
**Security**: baixo risco — nenhuma escrita destrutiva, nenhuma EF privilegiada nova. A superfície de revogação lê/escreve own-row
**Portão destrutivo**: não se aplica (fase de configuração, zero ação destrutiva por desenho)
**Nota de escopo**: `RETEN-05` (retenção de `notificacoes_enviadas`) **não** está aqui — a *linha* na matriz nasce nesta fase junto com RETEN-01, mas o requirement só é observável quando a purga executa, então mapeia para a Phase 46. `preferencias_notificacoes` (achado incidental do FK-AUDIT) deve ser **inspecionada antes** de projetar qualquer estrutura de opt-out — pode ser reuso, não tabela nova

### Phase 44: Exportação & Acesso

**Goal**: O candidato recebe uma cópia honesta dos próprios dados — e o sistema ganha, **exercitado em produção**, o inventário de PII que a fase irreversível vai consumir como plano de exclusão em vez de um palpite novo.
**Depends on**: Phase 43 (as colunas de consentimento versionado entram na allowlist do export) · Phase 42 (INVENT-01 é a semente da allowlist)
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04, EXPORT-05, EXPORT-06
**Success Criteria** (o que tem de ser VERDADE):

  1. O candidato pede uma cópia dos seus dados pelo painel e recebe um JSON com o que o sistema realmente guarda sobre ele, montado por **allowlist explícita de colunas** — nunca `select('*')`, a classe de vulnerabilidade nº 1 recorrente deste projeto, já responsável por dois incidentes anteriores.
  2. O currículo é entregue por **signed URL de TTL curto** a partir do bucket privado — nunca inline no JSON, nunca base64.
  3. Adicionar uma coluna nova ao banco **quebra o teste de snapshot** das chaves do export: nenhuma coluna entra no export por acidente e nenhuma sai dele em silêncio.
  4. O prazo do **Art. 19, II (15 dias corridos)** é medido a partir do registro do pedido e está visível ao RH — um pedido que se aproxima do prazo é distinguível de um recém-chegado.
  5. O inventário que o export projeta é um artefato **nomeado e versionado** que a Phase 45 consome como plano de exclusão — a fase irreversível não refaz o levantamento.

**Plans**: 9 plans (5 waves — o tracer é a wave 3, e as duas expansões do candidato ficam em série porque ambas tocam `exportacaoService.ts` e `PrivacidadeCandidatoPage.tsx`. Os dois planos do lado RH correm em paralelo com os do candidato: arquivos disjuntos, zero conflito de wave)

Plans:

- [x] 44-01-PLAN.md — Os dois insumos da allowlist antes de qualquer linha de export: o arquivo que declara o escopo do titular e o gerador que funde catálogo vivo + classificação do YAML, falhando alto quando não fecham (BD-6)
- [x] 44-02-PLAN.md — As duas tabelas que fazem o pedido existir como fato durável (`solicitacoes_dados` É o cooldown e É o marco do Art. 19, II; `config_sla_dados`) e as duas RPCs de supervisão com o predicado do BD-8 escrito uma vez
- [x] 44-03-PLAN.md — O inventário do export como artefato versionado, gerado e nunca digitado, com os DOIS guardas do SC#3 — e o smoke SQL provado **mordendo**
- [x] 44-04-PLAN.md — **CHECKPOINT do orquestrador**: apply das 2 migrations na ordem, ledger reconciliado, fidelidade por md5, smoke executado e M3 (policies vivas) LIDO antes de qualquer afirmação de RLS
- [ ] 44-05-PLAN.md — **TRACER**: a fatia vertical do clique ao `.json` — EF `exportar-meus-dados` (allowlist, corpo não lido, registro antes da montagem, 429/`COOLDOWN`), serviço, hook, bloco e seção 3, provada ao vivo · ⚠ **código completo e verde (Tasks 1-2, 3 commits); a Task 3 — deploy + prova ao vivo — é checkpoint do orquestrador e NÃO rodou.** O `[x]` é reservado para depois da prova: a própria linha diz "provada ao vivo"
- [x] 44-06-PLAN.md — A cópia honesta: o segundo arquivo feito para uma pessoa ler (escape + fronteira do inventário escrita) e os dois estados que faltavam ao CTA — sucesso persistente e cooldown que nunca é botão morto
- [ ] 44-07-PLAN.md — EXPORT-03: o titular abre o próprio currículo por URL assinada de 60 s cunhada **no cliente**, com `service_role` fora do caminho, e falha por linha em vez de bloco derrubado · ⚠ **código completo e verde (3 tasks, 4 commits, 93 testes na feature, suíte 1584, tsc 97); o `<human-check>` da Task 3 — abrir o próprio CV ao vivo, confirmar a expiração do TTL de 60 s e as três asserções negativas do DevTools — NÃO rodou** (exige login real de candidato de teste). O `[x]` fica reservado para depois da observação: o `<done>` da Task 3 exige "um candidato real de teste abriu o próprio currículo ao vivo"
- [x] 44-08-PLAN.md — EXPORT-05, camada de dados do RH: o classificador de faixa reusado por alias (identidade de referência asserida), o serviço que lê as duas RPCs do BD-8 por allowlist sem filtro de cliente, e os três hooks com fábrica de chaves única
- [ ] 44-09-PLAN.md — EXPORT-05, a TELA: `/rh/pedidos-dados` com badge de Situação âmbar, faixa de acompanhamento vermelha (eixos distintos), fila sem ação, e os três sítios do menu com contador — o SC#4 deixa de ser inalcançável · ⚠ **código completo e verde (3 tasks, 3 commits, 117 testes na feature+sidebar, suíte 1559, tsc 97); o `<human-check>` da Task 3 — UAT ao vivo medindo fila ≡ contador nos DOIS papéis do BD-8 — NÃO rodou** (exige login real de recrutador e de administrador). O `[x]` fica reservado para depois da observação: o `<done>` da Task 3 exige, com estas palavras, "um RH real e um administrador real abriram a fila ao vivo"

**UI hint**: yes — pedido de cópia no painel do candidato (mobile-first) + visibilidade do prazo no lado RH
**Security**: **candidata a `/gsd-secure-phase`** — é uma superfície de exfiltração de PII por desenho: allowlist, TTL do signed URL, autorização own-row, e o risco de a EF vazar coluna alheia
**Portão destrutivo**: não se aplica (read-only por construção)

### Phase 45: Motor de Exclusão & Anonimização

> ⚠️ **FASE DE MAIOR RISCO DO MILESTONE.**

**Goal**: O candidato pede que seus dados sejam apagados e isso acontece de verdade — irreversivelmente, na ordem imposta pela plataforma, sem levar junto a trilha de decisão humana que a RNF-07a existe para proteger.
**Depends on**: Phase 44 (inventário/plano de exclusão) **e** Phase 43 (política/base legal). Ambas obrigatórias — restrição dura #4
**Requirements**: ERASE-01, ERASE-02, ERASE-03, ERASE-04, ERASE-05, ERASE-06, ERASE-07, ERASE-08, ERASE-09, ERASE-10
**Success Criteria** (o que tem de ser VERDADE):

  1. O candidato distingue no painel **"retirar minha candidatura"** (encerra o funil na hora) de **"apagar meus dados"** (enfileira e executa após o encerramento), e o pedido de exclusão tem **janela de arrependimento que ele mesmo cancela** pelo painel.
  2. Executado o pedido: o currículo some do Storage, o registro do candidato vira tombstone anônimo e o usuário do Auth deixa de existir — **nessa ordem** — e re-executar o mesmo pedido não muda nada (idempotente em cada passo). Uma falha no meio não perde os ponteiros: os caminhos do Storage foram capturados no plano **antes** da primeira mutação, então o pedido é retomável.
  3. Depois da anonimização ninguém consegue voltar do tombstone à pessoa: não sobra `user_id` apontando para linha viva do Auth (isso é **pseudonimização** sob o Art. 12 §1º e não desincumbe o titular), e as 5 tabelas de FK `SET NULL` (`ai_call_logs`, `candidate_ai_decisions`, `logs_acesso`, `recruiter_alerts`, `autorizacoes`) foram tratadas explicitamente em vez de deixadas órfãs.
  4. `historico_candidatura`, `decisao_final` e `decisao_final_historico` continuam com as mesmas linhas e as **mesmas FKs `NO ACTION`** de antes — a trilha de decisão sobrevive à exclusão do candidato e **nenhuma constraint foi relaxada para CASCADE** (o reflexo errado diante do primeiro 23503).
  5. O candidato recebe um **recibo honesto em duas colunas** — o que foi apagado / o que foi mantido, anonimizado, sob qual artigo — sem superestimar o que foi feito; e a série de bias EEOC 4/5 continua produzindo os mesmos números para os períodos anteriores, porque a faixa etária foi **materializada no tombstone antes** de qualquer anonimização rodar.

**Plans**: 11 plans (5 waves · 10/10 requirements cobertos · 13/13 decisões do CONTEXT com plano implementador · 18/18 arestas e 36/36 considerações de UI levantadas)

Plans:
**Wave 1**

- [x] 45-01-PLAN.md — Sondas de PROD (5 read-only + 1 de escrita controlada) — **nenhuma migration da fase pode ser escrita antes deste plano fechar**
- [x] 45-02-PLAN.md — Wave 0: gerador do recibo em duas colunas a partir do `pii-inventory.yaml` (30/69 tabelas do `exportAllowlist.ts` não bastam) + `check:recibo-exclusao`

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 45-03-PLAN.md — **TRACER**: a fatia vertical NÃO-destrutiva "pedir exclusão" — migration → RPC DEFINER → EF → service → hook → seção 4
- [ ] 45-04-PLAN.md — Smoke SQL RED: a especificação executável do motor, com as negativas do ERASE-08/10 primeiro no arquivo (lição W-1 da P43)
- [x] 45-05-PLAN.md — ERASE-01: faixa etária materializada + k=5 com supressão **complementar**, e a tensão SC#5 × D-45-04 resolvida por escrito

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 45-06-PLAN.md — **CHECKPOINT**: apply do tracer + deploy da EF + prova ponta a ponta em PROD, antes de qualquer linha destrutiva
- [ ] 45-07-PLAN.md — Metade Postgres: severação de `candidatos.user_id` (D-45-11, `one-way`) + plano por expressão única + tombstone com `p_dry_run` no MESMO corpo
- [ ] 45-08-PLAN.md — Confirmação aninhada, recibo em duas colunas (um componente, dois tempos), painel da janela e Emenda B da Phase 43
- [ ] 45-09-PLAN.md — ERASE-05: retirar candidatura no card, 6º evento do vocabulário fechado, e a candidatura encerrada legível no RH

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 45-10-PLAN.md — EF: os três passos destrutivos (`Storage → Postgres → Auth`) + recibo ao titular fora do ledger (D-45-12/R1)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 45-11-PLAN.md — **PORTÃO DESTRUTIVO**: code review bloqueante → dry-run pela MESMA query → apply na ordem obrigatória → smokes verdes → execução real vigiada → `VERIFICATION.md` com veredito

**Waves**: 1 → (45-01, 45-02) · 2 → (45-03, 45-04, 45-05) · 3 → (45-06, 45-07, 45-08, 45-09) · 4 → (45-10) · 5 → (45-11)
**⚠ Regra de wave desta fase**: nenhuma wave mistura *escrever* uma migration com *aplicá-la* — subagentes GSD não recebem os tools MCP do Supabase, então todo apply, toda inspeção em PROD e todo deploy de EF são checkpoint do orquestrador (45-01, 45-06 e 45-11 são inteiramente checkpoint)
**UI hint**: yes — fluxo candidate-facing net-new (retirar × apagar, confirmação, janela de arrependimento, recibo). É a superfície onde uma ambiguidade de copy vira ação irreversível: forte candidata a `/gsd-ui-phase`
**Security**: **`/gsd-secure-phase` obrigatório** — service_role, Storage Admin, Auth Admin, mutação cross-sistema sobre PII viva
**Portão destrutivo**: **integral.** Os 5 itens do portão são condição de fechamento
**⚠ Por que esta é a fase de maior risco**: é uma mutação de três sistemas **genuinamente não-atômica** (Storage → Postgres → Auth) **sem transação compartilhada**, sobre PII viva, num ambiente onde os backups do Supabase cobrem **7 dias e excluem Storage inteiramente** — um CV apagado é **irrecuperável por qualquer meio**. `DELETE FROM storage.objects` via SQL remove só o metadado e **órfã o blob permanentemente**: o único caminho é a Storage Admin API a partir de Edge Function
**A resolver no discuss-phase (não inferir)**: janela de arrependimento (nº de dias) · BD-9 (redigir ou preservar a justificativa ≥50 caracteres do recrutador em `decisao_final`, que pode conter PII digitada à mão e é simultaneamente a prova legal de não-discriminação sob o Art. 7º, VI) · limiar mínimo de célula (k-anonymity) do `gerar_bias_snapshot()` · comportamento de `shouldSoftDelete` no re-cadastro (**não documentado pelo Supabase** — testar empiricamente numa conta descartável **antes** de desenhar em cima, nunca assumir) · status do PITR como fato datado (decisão de gasto do operador)

### Phase 46: Purga Automática (dry-run → live)

**Goal**: O dado expira sozinho, dentro de um cerco — e a primeira coisa que a purga faz em produção é **não apagar nada**.
**Depends on**: Phase 45 (motor provado) **e** Phase 43 (janela/política). Estritamente sequencial após 45 — cabear um cron a um motor destrutivo não provado é como um bug vira incidente
**Requirements**: PURGA-01, PURGA-02, PURGA-03, PURGA-04, PURGA-05, PURGA-06, PURGA-07, RETEN-05
**Success Criteria** (o que tem de ser VERDADE):

  1. O cron de purga (espelhando o padrão já provado do `notif-retry-sweep`) roda em PROD por um **período documentado em `dry_run`** antes de qualquer execução real, e o relatório do dry-run é gerado pela **MESMA query** do delete real, envolvida em rollback — um dry-run que diverge do predicado real é decoração, e este projeto já embarcou essa exata classe de falha uma vez (P39/CR-02: uma guarda que era dead code).
  2. O flip `dry-run → live` é um **checkpoint separado e evidenciado** (espelho da disciplina `NOTIFICACOES_MODO=teste→producao` do M7), nunca efeito colateral de um deploy.
  3. Uma execução não consegue passar do cap de blast-radius, e um **kill switch** para a purga sem deploy — provado desligando de verdade, não por leitura de config.
  4. Uma candidatura **sem decisão registrada** (`data_decisao` NULL) é classificada corretamente pelo predicado: não é engolida em silêncio nem purgada por engano. O predicado usa `COALESCE` explícito e **allowlist de estados terminais**, nunca denylist de estados ativos — o modo de falha em que o sistema acredita ter uma política funcionando e apaga zero.
  5. Cada execução deixa linha no ledger dizendo **o que foi apagado, quando e sob qual política** — inclusive a retenção de `notificacoes_enviadas`, cujo comentário em produção diz literalmente "Retention INDEFINITE, deferred to LGPD-OPS (M8+)".

**Plans**: TBD
**UI hint**: não — trabalho de cron/ops/DB. Se surgir uma leitura RH do ledger de purga, é derivada, não a entrega
**Security**: **candidata a `/gsd-secure-phase`** — automação destrutiva não-supervisionada com cap e kill switch como controles de segurança, não de conveniência
**Portão destrutivo**: **integral.** Os 5 itens do portão são condição de fechamento

### Phase 47: Transparência & Consolidação

**Goal**: O que o sistema faz com o dado está escrito onde o candidato lê — e nenhuma promessa de compliance sobrevive neste repositório sem código que a execute.
**Depends on**: Phase 43 (TRANSP-02 deriva da matriz de retenção como **dado**). Lê melhor depois da 45, mas **não depende da 46** — laterally parallelizable com a Phase 46
**Requirements**: TRANSP-01, TRANSP-02, CONSOL-01, CONSOL-02, CONSOL-03, CONSOL-04
**Success Criteria** (o que tem de ser VERDADE):

  1. Qualquer visitante lê, numa página pública, **com quem os dados são compartilhados** (Resend, provedor de LLM, Supabase, Vercel — Art. 18, VII) e **o que é guardado, por quanto tempo e por quê** — esta última **derivada da matriz de retenção como dado**, não redigida à mão (uma página escrita à mão diverge da política na primeira mudança de janela).
  2. O Histórico do candidato (VISRH-03) mostra o **nome do recrutador** que agiu, não o UUID do `ator`.
  3. Toda promessa de retenção/exclusão em comentário de migration ou documento tem **código vivo que a executa**, provado por um checklist versionado — e o zumbi `data_deletion_log` (existe desde 2026-06-09 prometendo uma `delete_candidate_data()` que a Phase 15 nunca criou, ausente de `pg_proc`, 0 linhas, repropositado pelo rollback da prompt-library) foi resolvido: removido ou adotado com escritas reais.
  4. As 6 fases do M7 sem veredito Nyquist (36/38/39/41 em `draft`, 37/40 sem arquivo) têm arquivo `VALIDATION.md` com veredito real.

**Plans**: TBD
**UI hint**: yes — 2 páginas públicas net-new + a correção do Histórico no lado RH
**Security**: baixo risco — páginas informativas e um join. A exceção é CONSOL-03
**Portão destrutivo**: aplica-se **só a CONSOL-03** — `DROP` de `data_deletion_log` é destrutivo sobre um objeto com **escritor vivo** (o RPC de rollback da prompt-library, `20260609000002:227`). Dropar sem religar esse escritor quebra a prompt-library em silêncio. Recomendação da pesquisa: construir o tombstone novo (`candidatos_anonimizados`) e dropar o stub — mas só depois de provar que o escritor vivo foi realocado

<details>
<summary>✅ v1.0 — M1 MVP Candidato (Phases 1–5) — SHIPPED 2026-06-06</summary>

Full detail archived in `milestones/v1.0-ROADMAP.md`. Requirements: `milestones/v1.0-REQUIREMENTS.md`. Audit: `milestones/v1.0-MILESTONE-AUDIT.md` (PASSED, 38/38 reqs).

</details>

<details>
<summary>✅ v2.0 — M2 Funil RH + Avaliação por IA (Phases 6–16) — SHIPPED 2026-06-26</summary>

Full detail archived in `milestones/v2.0-ROADMAP.md`. Requirements: `milestones/v2.0-REQUIREMENTS.md`. Audit: `v2.0-MILESTONE-AUDIT.md` (PASSED, 42/42 reqs; o único BLOCKER AVAL-03 foi corrigido + redeployado + PROD-smoked pós-audit). Pipeline backbone de 6 etapas + IA-assisted evaluation; `historico_candidatura` + o trigger `avancar_etapa()` (único escritor da trilha) nascem aqui, na Phase 6 — a fundação que o M7 reusou (o trigger CASE de DISPATCH-01 lê `historico_candidatura`). **A Phase 15 é também a origem do zumbi `data_deletion_log` que o M8/Phase 47 (CONSOL-03) resolve** — a tabela nasceu com o COMMENT prometendo uma `delete_candidate_data()` que nunca foi escrita.

</details>

<details>
<summary>✅ Phase 17 — Navegação & Arquitetura de Informação (standalone mini-fase) — SHIPPED 2026-06-28</summary>

Cabeou na navegação real de produção o funil construído no M2, antes só alcançável por URL direta / DevNavigationMenu DEV-only. 5/5 plans / 4 waves. Standalone — sem lifecycle de milestone.

</details>

<details>
<summary>✅ v3.0 — M3 Refinamento RH & Hardening (Phases 18–21) — SHIPPED 2026-06-30</summary>

Full detail archived in `milestones/v3.0-ROADMAP.md`. Requirements: `milestones/v3.0-REQUIREMENTS.md`. Audit: `milestones/v3.0-MILESTONE-AUDIT.md` (12/12 reqs, status tech_debt). Hardening (não expansão) do funil de IA do M2: resiliência das EFs, code-splitting, RH edita o guia de entrevista, e fechamento de HUMAN-UATs live. A Phase 21 achou+corrigiu 3 defeitos live em PROD.

</details>

<details>
<summary>✅ v4.0 — M4 Correção & Blindagem do Funil (Phases 22–27) — SHIPPED 2026-07-13</summary>

Full detail archived in `milestones/v4.0-ROADMAP.md`. Requirements: `milestones/v4.0-REQUIREMENTS.md`. Audit: `milestones/v4.0-MILESTONE-AUDIT.md` (status tech_debt — 55/56 reqs Complete + DBMIG-01 sanctioned partial). Hardening/correção ponta-a-ponta em 6 fases (43 plans). **A P24/SEC-03 (`20260706110005_sec03_n8n_serverside.sql`) deixou 3 triggers `AFTER` com `net.http_post` + Vault secret `n8n_webhook_base` dormentes (graceful-skip) — a meia-ponte que o M7/Phase 39 substituiu, aposentando o n8n.** Invariante: IA recomenda, humano decide (RNF-07a).

</details>

<details>
<summary>✅ v5.0 — M5 Gestão de Usuários & Perfil RH (Phases 28–30) — SHIPPED 2026-07-14</summary>

Full detail archived in `milestones/v5.0-ROADMAP.md`. Requirements: `milestones/v5.0-REQUIREMENTS.md`. Audit: `milestones/v5.0-MILESTONE-AUDIT.md` (status tech_debt — 13/13 reqs Complete, 0 gaps). Feature-work enxuto com segurança como eixo: A14 console de gestão de usuários RH (EF authenticate-THEN-authorize admin-only) + A37 meu-perfil self-service (RPC SEG-03-por-construção). O padrão EF authenticate-THEN-authorize + smokes comportamentais que o M7 reusou foi provado aqui e no M4.

</details>

<details>
<summary>✅ v6.0 — M6 Operação do Funil RH (Phases 31–35) — SHIPPED 2026-07-17</summary>

Full detail archived in `milestones/v6.0-ROADMAP.md`. Requirements: `milestones/v6.0-REQUIREMENTS.md`. Audit: `v6.0-MILESTONE-AUDIT.md` (status tech_debt — 19/19 reqs Complete; integração cross-fase 9/9 seams WIRED, 4/4 E2E flows). *Reuse-and-tighten* security-first: construiu a **esteira** que faz o funil andar pela mão do RH — avançar/rejeitar/retroceder auditável (P31), fechamento dos 2 leaks horizontais vivos (P32, BLOCKING), `agendamentos_entrevista` + RLS bidirecional (P33), superfícies RH CV/IA/agendamento/Fila/KPIs (P34), e o card do agendamento no painel do candidato + `.ics` client-side (P35). **O `.ics` hand-rolled (RFC-5545) de `agendamentoCandidatoService.gerarIcsAgendamento` que o M7/Phase 38 portou verbatim para `_shared/ics.ts` nasce aqui.** Invariante: painel é o canal único (sem e-mail) — que o M7 complementou com o *push* transacional.

</details>

<details>
<summary>✅ v7.0 — M7 Comunicação com o Candidato (COMM) (Phases 36–41) — SHIPPED 2026-07-28</summary>

Full detail archived in `milestones/v7.0-ROADMAP.md`. Requirements: `milestones/v7.0-REQUIREMENTS.md`. Audit: `milestones/v7.0-MILESTONE-AUDIT.md` (status tech_debt — **21/21 reqs Complete**, 0 gaps; integração cross-fase 6/6, fluxos E2E 4/4).

Fez o candidato **saber** que o funil (operado pela mão do RH desde o M6) está andando. **Integração aditiva**, não greenfield: gatilhos de DB → `pg_net` → EF `notificar-candidato` (self-auth) → Resend, com **zero dependências npm novas** no caminho de envio. **Aposentou o n8n pessoal e resolveu SEC-03 por substituição** — os 4 triggers `trg_n8n_*` foram DROPados no mesmo phase que criou os novos (P39), sem janela de double-send.

Entregou: identidade de remetente & entregabilidade (P36); ledger `notificacoes_enviadas` + `config_sla_etapa` (P37); a EF com os 4 templates + port do `.ics` (P38); o rewire dos triggers (P39, fase de maior risco); a timeline de prazo no painel (P40); e a reconciliação webhook + retry `pg_cron` que fechou o fire-and-forget (P41).

**Incomum para um milestone: o pipeline foi provado por EXECUÇÃO EM PRODUÇÃO, não por leitura de código** — uma aprovação real disparou a cadeia `trigger → EF → Resend → webhook → ledger` e reconciliou para `entregue` em 5 s.

⚠ **Achado de processo:** a P39 fechou originalmente **sem VERIFICATION.md e sem code review**, e por isso 2 defeitos **CRÍTICOS** ficaram vivos em PROD (aprovado recebia a cópia de rejeição; survivor-guard do knockout era dead code). Cada camada de verificação aplicada depois encontrou algo que a anterior não pegou — o review achou CR-01/CR-02, e o UAT ao vivo achou W-01 (preheader não ramificado), invisível às asserções que olham só o texto visível. A fase de maior risco foi exatamente a que pulou o gate. **Este achado é a origem do "Portão de fase destrutiva" que o M8 adota como exit criterion de roadmap.**

**Aberto no fecho (não-bloqueante, rastreado):** `m7-ativar-modo-producao` (**high** — `NOTIFICACOES_MODO=teste`, nenhum candidato real recebe e-mail ainda) e `m7-cleanup-n8n-cloud` (superfície externa do n8n segue ativa). UAT-36-1 `partial`: infra fechada, falta só teste de caixa de entrada real. **A retenção de `notificacoes_enviadas`, diferida explicitamente pela P37 a "LGPD-OPS (M8+)", é o RETEN-05 da Phase 46.**

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 (M1) | v1.0 | 40/40 | Complete | 2026-06-06 |
| 6–16 (M2) | v2.0 | 63/63 | Complete | 2026-06-26 |
| 17 | standalone | 5/5 | Complete | 2026-06-28 |
| 18–21 (M3) | v3.0 | 16/16 | Complete | 2026-06-30 |
| 22–27 (M4) | v4.0 | 43/43 | Complete | 2026-07-13 |
| 28–30 (M5) | v5.0 | 19/19 | Complete | 2026-07-14 |
| 31–35 (M6) | v6.0 | 20/20 | Complete | 2026-07-17 |
| 36–41 (M7) | v7.0 | 25/25 | Complete | 2026-07-28 |
| 42. Inventário, Gates & Fila Art. 20 | v8.0 | 12/12 | In Progress|  |
| 43. Consentimentos Honestos & Política de Retenção | v8.0 | 9/9 | In Progress|  |
| 44. Exportação & Acesso | v8.0 | 6/9 | In Progress|  |
| 45. Motor de Exclusão & Anonimização ⚠️ | v8.0 | 3/11 | In Progress|  |
| 46. Purga Automática (dry-run → live) | v8.0 | 0/? | Not started | - |
| 47. Transparência & Consolidação | v8.0 | 0/? | Not started | - |

---

*v1.0 milestone shipped 2026-06-06 — full requirements and roadmap detail archived under `.planning/milestones/v1.0-*`.*
*v2.0 milestone shipped 2026-06-26 — 11 phases (6–16), 42/42 requirements, audit PASSED.*
*v3.0 milestone shipped 2026-06-30 — 4 phases (18–21), 12/12 requirements, audit tech_debt.*
*v4.0 milestone shipped 2026-07-13 — 6 phases (22–27), 55/56 requirements Complete + DBMIG-01 sanctioned partial, audit tech_debt.*
*v5.0 milestone shipped 2026-07-14 — 3 phases (28–30), 13/13 requirements, audit tech_debt.*
*v6.0 milestone shipped 2026-07-17 — 5 phases (31–35), 19/19 requirements, audit tech_debt.*
*v7.0 milestone shipped 2026-07-28 — 6 phases (36–41), 25 plans, 21/21 requirements Complete, audit tech_debt (0 gaps). Pipeline de comunicação provado ponta-a-ponta em produção.*
*v8.0 milestone aberto 2026-07-29 — 6 fases (42–47), **52/52 requirements mapeados**, 0 órfãos. Feature central irreversível; portão de fase destrutiva adotado como exit criterion de roadmap.*
