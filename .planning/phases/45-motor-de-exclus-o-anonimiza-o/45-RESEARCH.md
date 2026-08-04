# Phase 45: Motor de Exclusão & Anonimização — Research

**Researched:** 2026-08-04
**Domain:** Execução do direito de eliminação (LGPD Art. 18, VI) sobre três sistemas não-transacionais — Supabase Storage, Postgres e GoTrue Auth — num ATS em produção com PII viva, sem PITR e sem backup de Storage
**Confidence:** HIGH para os fatos deste codebase (medidos por `Read`/`grep` nesta sessão) · MEDIUM para plataforma Supabase (docs oficiais via Context7 + WebSearch) · LOW para o que só se fecha com sonda ao vivo em PROD

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-45-01:** A janela é de **15 dias**, cancelável pelo próprio titular no painel. Escolhido para **espelhar o prazo do Art. 19, II** que a Phase 44 já usa na fila do RH: uma só constante governa o SLA de acesso e a janela de cancelamento, então há **uma fonte a auditar em vez de duas a divergir**. — **Reversibility:** `costly`.
- **D-45-02:** **Preservar ANONIMIZADA** a justificativa do recrutador em `decisao_final`. O texto sobrevive como prova de não-discriminação (Art. 7º, VI / RNF-07a); o **vínculo com o titular, não**. Implica tratar a coluna por **tombstone/desvinculação**, nunca por `DELETE`.
- **D-45-03:** A mesma regra vale para **`decisao_final_historico.justificativa`**. — **Reversibility:** `one-way`.
- **D-45-04:** **Suprimir células com menos de 5 candidatos** (k=5) em `gerar_bias_snapshot()`. A célula suprimida tem a **presença declarada e a contagem oculta**.
- **D-45-05:** O `small_sample_warning` atual (**< 30**) **permanece como sinal separado**. `< 30` é sinal estatístico; `< 5` é controle de re-identificação. Hoje o código só SINALIZA e nunca suprime — é essa a lacuna que a fase fecha. — **Reversibility:** `reversible`.
- **D-45-06:** Pedir exclusão **encerra automaticamente as candidaturas em andamento** e o **RH é notificado**. A janela de 15 dias corre a partir daí.
- **D-45-07:** A alternativa "esperar o funil fechar sozinho" foi **rejeitada explicitamente**.
- **D-45-08:** A notificação ao RH exige **um evento novo** no vocabulário fechado, que é fechado em **dois lugares**: no código da EF **e** numa **CHECK constraint no banco**. — **Reversibility:** `costly`.
- **D-45-09:** A exclusão do usuário do Auth usa **hard delete** (`shouldSoftDelete = false`). Medição read-only contra PROD em 2026-08-04: o índice único vivo é `users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false)` — o predicado parcial é `is_sso_user = false`, **NÃO** `deleted_at IS NULL`. `auth.users` tem 29 linhas e 0 soft-deletadas. — **Reversibility:** `one-way`.
- **D-45-10:** **PITR NÃO será ligado** (decisão de gasto do operador). ⚠⚠ Consequência não-negociável: o **dry-run deixa de ser processo e passa a ser o mecanismo de segurança**. Nenhum apply destrutivo em PROD sem dry-run pela **MESMA query** do delete real, asserções negativas e code review bloqueante antes do apply.

### Claude's Discretion

- Forma do tombstone (quais colunas viram quê), estrutura da fila de exclusão, mecânica de idempotência e retomabilidade, e o desenho do recibo em duas colunas — todos a cargo do research/planner, dentro dos SC do ROADMAP.
- Ordem interna dentro de cada sistema (o `Storage → Postgres → Auth` entre sistemas é fixo).

### Deferred Ideas (OUT OF SCOPE)

- **Purga automática por cron** — Phase 46, estritamente sequencial após esta.
- **Página pública "o que guardamos e por quê"** e o zumbi `data_deletion_log` — Phase 47.
- **`ai_call_logs` com 0 linhas** — fora do escopo do M8; vale um todo próprio.
- `25-review-deferred.md` e `36-resend-chave-divergencia.md` — casaram por palavra-chave genérica, **não foram dobrados**.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ERASE-01** | Snapshot do agregado de bias com faixa etária materializada no tombstone, executado **antes** de qualquer anonimização | §Pitfall 6 (o `p_periodo` não filtra nada) · §Pattern 6 (coluna `faixa_etaria_materializada` + `COALESCE` na precedência certa) · §Pitfall 7 (k=5 exige supressão complementar) |
| **ERASE-02** | RPC `SECURITY DEFINER` de anonimização in-place (tombstone), uma transação para a metade Postgres | §Pitfall 1 (**as 6 CHECK constraints de `candidatos` matam sentinelas ingênuas**) · §Pitfall 2 (NOT NULL medido) · §Pattern 3 · §Segurança (REVOKE de `anon` + guard NULL-safe) |
| **ERASE-03** | EF `executar-direito-titular` executa na ordem **Storage → Postgres → Auth**, idempotente em cada passo | §Pattern 1 (diagrama + contrato de passo) · §Pattern 2 (idempotência por estado no plano, não por try/catch) · §Don't Hand-Roll |
| **ERASE-04** | Caminhos do Storage capturados no plano **antes** de qualquer mutação | §Pitfall 4 (**`list(authUid)` é a enumeração autoritativa, `curriculo_url` não é**) · §Pattern 2 |
| **ERASE-05** | "Retirar candidatura" distinto de "apagar meus dados" | §Pitfall 3 (**as duas modelagens óbvias do encerramento estão erradas** — uma manda e-mail de rejeição, a outra forja auto-rejeição) · §Pattern 4 |
| **ERASE-06** | Janela de arrependimento cancelável pelo candidato no painel | §Pattern 5 (extensão de `solicitacoes_dados`; a janela como CONFIG, no idioma de `config_sla_dados`) |
| **ERASE-07** | Recibo honesto em duas colunas, sem superestimar | §Pattern 7 (**a fonte é `pii-inventory.yaml`, não `exportAllowlist.ts`** — este cobre 30 de 69 tabelas) · §Pitfall 5 |
| **ERASE-08** | Trilha de auditoria intacta — as 3 FKs `NO ACTION` nunca relaxadas | §Pitfall 2 · §Asserções negativas obrigatórias · §Validation Architecture |
| **ERASE-09** | As 5 tabelas com FK `SET NULL` tratadas explicitamente | §Pattern 3 (tabela de tratamento por coluna) · §Pitfall 8 (`logs_acesso.ip_address` e `autorizacoes.ip_aceite` são `inet NOT NULL`) |
| **ERASE-10** | Anonimização irreversível de verdade — `user_id` apontando para linha viva do Auth é pseudonimização | §Pitfall 2 (**`candidatos.user_id` é `NOT NULL UNIQUE` com FK `ON DELETE CASCADE` viva — não dá para "só apagar o ponteiro"**) · §Pattern 3 (as três saídas e a recomendada) |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

Tratados com a mesma autoridade das decisões travadas. Um plano que os contrarie está errado.

| Diretiva | Onde morde nesta fase |
|---|---|
| **NUNCA `supabaseAdmin`/`service_role` no client-side** | Todo o motor vive em Edge Function. O painel do candidato só invoca e lê own-row. |
| **Operações privilegiadas em `supabase/functions/`** | `executar-direito-titular` e a extensão de `notificar-rh`. |
| **RLS em 100% das tabelas com dados de usuário** | A extensão de `solicitacoes_dados` herda a policy own-row viva; qualquer tabela nova de plano/ledger nasce com RLS. |
| **`db push` proibido / workaround 42601 em corpos `$$`** | Migrations aplicadas por MCP `apply_migration` + reconcile do ledger, **pelo orquestrador**. Sem wrapper `BEGIN;/COMMIT;`. |
| **`database.types.ts` NUNCA editado à mão** | E ele está **desatualizado** — ver §Pitfall 10. O idioma de contorno já existe no repo. |
| **Enums de domínio em snake_case pt-BR; código técnico em en** | `situacao`, `causa`, `tipo` de `solicitacoes_dados` seguem pt-BR. |
| **Services `camelCaseService.ts` com classes de erro próprias** | `exclusaoService.ts` + `ExclusaoError` com `code` (a UI-SPEC já nomeia). |
| **"avaliação comportamental/cognitiva", nunca "teste psicológico"** | Grep-guard repo-wide já existente. |
| **RNF-07a — o sistema NUNCA rejeita candidato automaticamente por score** | §Pitfall 3: a modelagem errada do encerramento **grava `auto_rejeitado = true`**, fabricando exatamente a evidência que a RNF-07a existe para negar. |

---

## Summary

Esta fase tem uma característica que nenhuma anterior teve: **o modo de falha mais provável não é "não funciona", é "funciona pela metade e a metade que sumiu não volta"**. Com o PITR desligado (D-45-10) e o Storage fora de qualquer caminho de backup, a única rede que existe é o dry-run — e ele só é uma rede se executar literalmente a mesma expressão que a execução real, disciplina que este projeto já provou saber aplicar em `candidaturas_alem_da_janela()` (`20260801000004_p43_previa_retencao.sql:174`), cujo COMMENT vivo diz, endereçado à fase seguinte: *"CHAME ESTA FUNCAO, nao copie o corpo. O dry-run e o delete real TEM de sair da mesma expressao; um dry-run que diverge do predicado e decoracao."*

A pesquisa mediu quatro coisas que **redesenham** o plano em relação ao que os documentos de entrada assumem. Primeira: `candidatos.user_id` é `NOT NULL UNIQUE` com FK `ON DELETE CASCADE` viva em PROD — o ERASE-10 ("não sobra `user_id` apontando para linha viva do Auth") **não é executável** sem alterar a coluna ou a constraint, e um `auth.admin.deleteUser` disparado antes disso não destrói o tombstone: ele **falha com 23503 depois de o currículo já ter sido apagado do Storage**, que é o pior desfecho alcançável nesta fase. Segunda: `public.candidatos` carrega **seis CHECK constraints de formato** (e-mail, CPF, celular, data de nascimento, gênero, UF) — um tombstone escrito com sentinelas plausíveis-mas-inválidas (`'[removido]'`) aborta a transação inteira de anonimização, provavelmente no primeiro pedido real. Terceira: as duas modelagens intuitivas de "encerrar a candidatura" estão ambas erradas por razões diferentes e ambas graves — via `etapa_atual='rejeitado'` com o JWT do titular, o trigger `trg_notif_transicao` **dispara um e-mail de rejeição para quem acabou de pedir para ser esquecido**; via `service_role`, `avancar_etapa()` grava `auto_rejeitado = true`, forjando prova de rejeição automática na tabela que existe para provar o contrário. Quarta: `exportAllowlist.ts` cobre **30 das 69 tabelas** do catálogo — derivar o recibo dele omitiria em silêncio oito tabelas de telemetria que guardam PII do titular, incluindo três das cinco tabelas `SET NULL` do próprio ERASE-09.

O que a fase tem a favor é que quase tudo de que precisa já existe e foi construído com esta fase em mente. `docs/compliance/pii-inventory.yaml` classifica coluna a coluna com o vocabulário exato de que o motor precisa (`apagar` / `anonimizar` / `preservar` / `preservar_com_ressalva`) e nomeia a Phase 45 como consumidora. `solicitacoes_dados` nasceu com `tipo IN ('acesso','exclusao')` e com um COMMENT que diz literalmente que a semântica de `ON DELETE` daquela FK **pertence a esta fase**. `get-curriculo-url` e `exportar-meus-dados` são o molde estrutural da EF privilegiada. `previa_retencao()` é o precedente do dry-run por expressão única, com `md5(prosrc)` pinado no smoke. E o `.husky/pre-commit` **já não é o gate binário permanentemente vermelho** que os documentos de entrada descrevem: a Phase 42 o converteu em gate de não-regressão contra a baseline 97, então "zero `--no-verify`" é hoje satisfazível honestamente.

**Primary recommendation:** construa o motor como **um plano persistido primeiro e três executores idempotentes depois** — uma linha `solicitacoes_dados` do tipo `exclusao` que carrega a janela, o estado de execução por sistema e os caminhos de Storage capturados **antes da primeira mutação**; um RPC `SECURITY DEFINER` único que faz a metade Postgres inteira em uma transação e aceita `p_dry_run` implementado por `RAISE EXCEPTION` no fim do **mesmo** corpo (nunca dois corpos); e a ordem `Storage → sever `user_id` + tombstone → Auth` com a severação do `user_id` como pré-condição estrutural do `deleteUser`, não como detalhe de ordem.

---

## Correções factuais aos documentos de entrada — medidas nesta sessão

Registradas primeiro porque quatro delas mudam o plano e duas **reduzem** risco.

### C1 · `.husky/pre-commit` NÃO está permanentemente vermelho — foi convertido na Phase 42

O brief e o `STATE.md §Blockers` dizem que o hook é binário sobre uma baseline de 97 erros e que isso treina `--no-verify`. O arquivo vivo é outra coisa [VERIFIED: `.husky/pre-commit:42-49`]:

```sh
COUNT=$(npm run -s lint 2>&1 | grep -c "error TS" || true)
echo "tsc errors: $COUNT (frozen baseline: 97)"
if [ "$COUNT" -gt 97 ]; then
  echo "erro: contagem de erros tsc ($COUNT) excede a baseline congelada (97) — erro de tipo novo introduzido"
```

O próprio docblock diz por que (`.husky/pre-commit:33-40`): *"O portão de fase destrutiva do milestone M8 … exige commit COM o hook rodando e passando — zero `--no-verify`. Com o hook binário anterior isso era literalmente impossível de satisfazer honestamente."* **Consequência para o plano:** "zero `--no-verify`" não precisa de exceção nem de nota de escape. Um commit desta fase passa se não introduzir erro de tipo novo — e o §Pitfall 10 explica onde essa fase corre risco de introduzir um.

### C2 · `exportAllowlist.ts` **não é** o plano de exclusão — cobre 30 de 69 tabelas

O `45-CONTEXT.md` e a `45-UI-SPEC.md` nomeiam `supabase/functions/_shared/exportAllowlist.ts` + `docs/compliance/export-scope-rules.yaml` como a fonte derivada do recibo, citando *"o inventário **é** o plano de exclusão"*. Medido [VERIFIED: `supabase/functions/_shared/exportAllowlist.ts`, parse dos objetos `tabelas` e `excluidas`]:

| Métrica | Valor |
|---|---|
| Tabelas **em escopo** do export | **30** |
| Tabelas **excluídas** do export | **39** |
| `tabelas_catalogadas` (meta do próprio arquivo) | **69** |

Das 5 tabelas `SET NULL` do ERASE-09, **`ai_call_logs` e `logs_acesso` estão FORA** do escopo do export (`"telemetria_interna"`), assim como `notificacoes_enviadas`, `sessoes_ativas`, `logs_auditoria`, `historico_acoes`, `webhooks_logs`, `rate_limit_check_duplicate` e `data_deletion_log`. Todas guardam dado do titular.

**A fonte correta do plano de exclusão é `docs/compliance/pii-inventory.yaml`**, que cobre o catálogo inteiro (`escopo: tabelas_base_public: 64, colunas_public: 993`) e cujo vocabulário é exatamente o que o motor precisa [VERIFIED: `docs/compliance/pii-inventory.yaml:31-46`]:

> `apagar` — "Dado pessoal sem função probatória."
> `anonimizar` — "Dado pessoal cuja LINHA precisa sobreviver … mas cujo CONTEÚDO identificante deve ser destruído in-place (tombstone). Art. 12 caput + Art. 16, IV."
> `preservar` — "Não é dado pessoal, OU é dado cuja preservação é exigida por obrigação legal/probatória."
> `preservar_com_ressalva` — "Estruturalmente não-PII, mas pode CARREGAR PII digitada por humano ou embutida por IA … **Exige tratamento caso a caso na Phase 45 — não pode ser classificado em massa.**"

E o próprio arquivo se declara insumo desta fase (`pii-inventory.yaml:26`): `- "Phase 45 — plano de exclusão/anonimização (ERASE-02, ERASE-06)"`.

O `exportAllowlist.ts` continua útil e continua sendo a **projeção derivada** — ele carrega os vereditos herdados como proveniência (`"inventario:apagar"` ×41, `"inventario:preservar"` ×43, `"inventario:preservar_com_ressalva"` ×38, `"inventario:anonimizar"` ×8). Mas o recibo derivado só dele afirmaria menos do que o motor faz em 39 tabelas, e afirmaria **nada** sobre as duas tabelas de log que mais carregam PII.

### C3 · `database.types.ts` está desatualizado e **não conhece `solicitacoes_dados`**

[VERIFIED: `database.types.ts`, último commit `6a1b13f` de 2026-08-02; `grep -c "      solicitacoes_dados: {"` → **0**; idem `config_sla_dados` → 0 e `listar_pedidos_dados` → 0]. A Phase 44 embarcou sem regenerar (bloqueio nomeado em `STATE.md`: auth gate do CLI). Ver §Pitfall 10 para o idioma de contorno já estabelecido no repo — que o plano deve **reusar, não reinventar**.

### C4 · A "imposição de plataforma" do ERASE-03 precisa ser re-medida

`REQUIREMENTS.md:25` afirma: *"Storage ANTES de Auth (ERASE-03). Imposição de plataforma: o Supabase recusa deletar usuário que possua objetos no Storage."* A doc oficial confirma a regra [CITED: supabase.com/docs/guides/auth/managing-user-data] — mas a doc de Storage registra que **`storage.objects.owner` está DEPRECADA em favor de `owner_id` (`text`, sem FK)** [CITED: supabase.com/docs/guides/storage/security/ownership]. Se este projeto já roda a versão com `owner_id`, a FK bloqueadora pode não existir, e a "imposição" some.

**Isso não muda a ordem** — ela permanece obrigatória por três razões independentes que não dependem da FK: (i) o caminho do objeto é `{authUid}/{uuid}.pdf` [VERIFIED: `src/features/vagas/services/cvUploadService.ts:130-131`], então depois do `deleteUser` o prefixo é intraçável; (ii) apagar `storage.objects` por SQL órfã o blob para sempre; (iii) o `user_id` tem de ser severado antes do `deleteUser` de qualquer jeito (§Pitfall 2). **Mas o plano não pode escrever "o Supabase nos protege" como se fosse controle.** Sonda de orquestrador em §Environment Availability.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Registrar o pedido de exclusão + janela | **API / Edge Function** (`service_role`) | Database (RLS own-read) | Espelha a decisão do 44: **zero policy de escrita para o candidato**, porque quem pode inserir pode também não inserir e furar o marco temporal. O registro é afirmação do servidor sobre fato do servidor. |
| Cancelar dentro da janela | **API / Edge Function** | Database | Mesma razão. Cancelamento é mutação de estado legal, não preferência de UI. |
| Encerrar candidaturas em andamento | **Database (RPC `SECURITY DEFINER`)** | API (orquestração) | Precisa rodar na mesma transação do registro do pedido e precisa **não** passar pelos triggers de e-mail de funil (§Pitfall 3). |
| Enumerar objetos do Storage do titular | **API / Edge Function** (Storage Admin API) | — | Impossível de SQL sem orfanar o blob. Enumeração é `list()` paginado, não `SELECT`. |
| Apagar objetos do Storage | **API / Edge Function** (Storage Admin API) | — | Único caminho suportado. |
| Tombstone / anonimização | **Database (RPC `SECURITY DEFINER`, uma transação)** | — | Atomicidade da metade Postgres é a única atomicidade disponível na fase. |
| Deletar o usuário do Auth | **API / Edge Function** (`auth.admin.deleteUser`) | — | `service_role`-only por definição. |
| Materializar a faixa etária + snapshot de bias | **Database (RPC)** | — | Deriva de `candidatos.data_nascimento` por JOIN; tem de acontecer antes de a coluna morrer. |
| Dry-run do plano de exclusão | **Database (a MESMA função do executor)** | API (apresentação) | Duas expressões = decoração. Precedente vivo: `candidaturas_alem_da_janela()`. |
| Recibo em duas colunas | **Build-time (artefato gerado) + Browser/Email** | Database (fatos do pedido) | Derivado do inventário, nunca digitado — mesma disciplina do `gen-export-allowlist.cjs`. |
| Aviso ao RH | **API / Edge Function `notificar-rh`** | Database (CHECK do vocabulário) | EF própria desde a Phase 42; `notificar-candidato` não é tocada. |
| Legibilidade da candidatura encerrada no RH | **Browser** | Database (o estado) | Sem tela nova; é copy + predicado de leitura. |

---

## Standard Stack

### Core — tudo já instalado; esta é uma fase de "usar o que existe"

| Library / Recurso | Version | Purpose | Why Standard |
|---|---|---|---|
| `@supabase/supabase-js` | `^2.104.0` (client) · `https://esm.sh/@supabase/supabase-js@2` (EF) | Storage Admin API, `auth.admin.deleteUser`, RPC | Único caminho suportado para apagar objeto de Storage. Import **estático** de `esm.sh` na EF — a forma construída em runtime escondeu o pacote do bundler e produziu `ERR_MODULE_NOT_FOUND` na P10-13 [VERIFIED: `supabase/functions/get-curriculo-url/index.ts:37-39`] |
| PL/pgSQL `SECURITY DEFINER` | Postgres 17 | Tombstone in-place, dry-run, plano | `anon` (PostgreSQL Anonymizer) está **ausente de `pg_available_extensions`** — não é "não instalada", é não-instalável [VERIFIED: `.planning/research/FK-AUDIT-LIVE.md:94-96`] |
| `pgcrypto` | 1.3 (instalada) | Só se o plano optar por HMAC em algum sentinel | Já viva; nenhuma extensão nova é necessária |
| `@tanstack/react-query` | `^5.90.10` | Leitura own-row do pedido + mutations sem otimismo | Idioma vivo da feature `privacidade` |
| `react-hook-form` + `zod` | já instalados | Não usados nesta fase (não há formulário) | Registrado para o executor não os alcançar por reflexo |
| `lucide-react` | já instalado | `Loader2` dos estados em voo | UI-SPEC |

### Supporting — artefatos e moldes internos que valem mais que biblioteca

| Ativo | Caminho | When to Use |
|---|---|---|
| **Inventário PII coluna-a-coluna** | `docs/compliance/pii-inventory.yaml` | **A fonte do plano de exclusão.** Cada coluna tem `classificacao` no vocabulário do motor |
| Gerador + `--check` | `docs/compliance/sql/gen-export-allowlist.cjs`, `npm run check:export-allowlist` | Molde do gerador do recibo (artefato duplo `.json` + espelho `.ts`, ambos sob `--check`) |
| Predicado único + dry-run | `supabase/migrations/20260801000004_p43_previa_retencao.sql:174` | Molde exato do "mesma expressão"; o smoke pina `md5(prosrc)` e assere que os wrappers **chamam** |
| EF privilegiada | `supabase/functions/get-curriculo-url/index.ts` · `supabase/functions/exportar-meus-dados/index.ts` | D-23 two-client, authenticate-THEN-authorize, `Deps` injetável, handler testável sem `Deno.serve` |
| EF de aviso ao RH | `supabase/functions/notificar-rh/` (+ `helpers.ts`) | Um evento hoje (`EVENTO_LEDGER_RH = 'revisao_solicitada'`); passa a dois. `dedupe_key` **por destinatário** |
| Escape/layout de e-mail | `supabase/functions/_shared/email-templates.ts` (`escapeHtml`, `layoutBase`) | Nunca reimplementar — é o escape canônico |
| Ponte de tipos para tabela ausente do `database.types.ts` | `src/features/privacidade/services/exportacaoService.ts:766-792` | §Pitfall 10 |
| Config-como-dado | `supabase/migrations/20260804000001_p44_config_sla_dados.sql:117-123` | Molde da tabela singleton de config para a janela de 15 dias |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Tombstone `UPDATE` in-place | Extensão `anon` | **Impossível** — fora do catálogo de PROD. E é a ferramenta errada: `anon` mascara dump, não apaga um titular em OLTP vivo |
| Tombstone in-place | Crypto-shredding por titular | Legítimo, mas exigiria re-arquitetar todo caminho de leitura (RLS, allowlists, prompts de IA) para uma postura que o Art. 12/16 IV já concede via anonimização [CITED: `.planning/research/STACK.md:281`] |
| RPC `SECURITY DEFINER` no tombstone | Fazer tudo na EF com `service_role` | Perde a atomicidade da metade Postgres. A EF não tem transação — o RPC tem, e é a **única** que a fase consegue |
| Extender `solicitacoes_dados` | Tabela `pedidos_exclusao` nova | A tabela já nasceu com `tipo IN ('acesso','exclusao')` **deliberadamente** para poupar retrofit sobre linhas vivas nesta fase [VERIFIED: `20260804000002_p44_solicitacoes_dados.sql:134-136`] |
| Ledger próprio do motor | Reusar `data_deletion_log` | A tabela é `(id, deletion_type, deleted_at, created_at)` — **não tem coluna para candidato nem para caminho de Storage** [VERIFIED: `20260609000001_prompt_library_schema.sql:315-321`], e o CONTEXT defere o zumbi à Phase 47 |
| `remove()` via Storage API | `DELETE FROM storage.objects` | Órfã o blob **permanentemente**. Merece grep-guard em CI |

**Installation:** nenhuma. **Zero dependência npm nova, zero extensão Postgres nova** — invariante do M8 herdada do M7.

---

## Package Legitimacy Audit

**Esta fase não instala pacote algum.** Nenhum `npm install`, nenhum `deno add`, nenhum `CREATE EXTENSION`.

| Package | Registry | Verdict | Disposition |
|---|---|---|---|
| *(nenhum)* | — | — | — |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

As duas dependências que a fase toca (`@supabase/supabase-js` no cliente e o mesmo pacote por `esm.sh` na EF) já estão no `package.json`/`deno.lock` e foram exercitadas em produção nas Phases 32/42/44.

---

## Architecture Patterns

### System Architecture Diagram

```
                          ┌──────────────────────────────────────────┐
   TITULAR (browser)      │  /candidato/privacidade  §4              │
   ───────────────        │  ExcluirDadosBloco (A: pedir · B: janela │
                          │  cancelável · C: em andamento)           │
                          │  /candidato/dashboard → RetirarCandidatura│
                          └───────────────┬──────────────────────────┘
                                          │ invoke (JWT do titular)
                                          ▼
                    ╔═════════════════════════════════════════════════╗
                    ║  EF  executar-direito-titular   (service_role)  ║
                    ║  authenticate ─▶ authorize(titular = auth.uid) ║
                    ╚════════┬════════════════════════════════════════╝
                             │
        ┌────────────────────┼─────────────────────┬────────────────────────┐
        │ ação = PEDIR       │ ação = CANCELAR     │ ação = EXECUTAR        │
        ▼                    ▼                     ▼   (janela vencida)
 ┌───────────────┐   ┌────────────────┐    ┌──────────────────────────────┐
 │ RPC registrar │   │ RPC cancelar   │    │  PASSO 0 — PLANO             │
 │ _pedido_      │   │ _pedido_       │    │  · snapshot de bias (ERASE-01)│
 │ exclusao()    │   │ exclusao()     │    │  · materializa faixa etária   │
 │ 1 transação:  │   │ situacao →     │    │  · list(bucket, authUid/)     │
 │ · linha tipo= │   │ 'cancelado'    │    │    → grava caminhos NO PLANO  │
 │   'exclusao'  │   │ (candidaturas  │    │    ANTES de qualquer mutação  │
 │ · encerra as  │   │  NÃO reabrem)  │    │  · nada foi mutado ainda      │
 │   candidaturas│   └────────────────┘    └───────────────┬──────────────┘
 │   (§Pitfall 3)│                                          │
 │ · executar_em │            ┌─────────────────────────────┼─────────────────────┐
 │   = now+janela│            ▼ 1                           ▼ 2                   ▼ 3
 └───────┬───────┘   ┌─────────────────┐    ┌────────────────────────────┐  ┌──────────────┐
         │           │ STORAGE         │    │ POSTGRES (UMA transação)   │  │ AUTH         │
         │ dispara   │ remove(paths)   │───▶│ RPC anonimizar_candidato() │─▶│ deleteUser   │
         ▼           │ ≤1000/chamada   │    │ · apagar / anonimizar /    │  │ shouldSoft   │
 ┌────────────────┐  │ verifica retorno│    │   preservar por coluna     │  │ Delete=false │
 │ EF notificar-rh│  │ marca no plano  │    │ · SEVERA candidatos.user_id│  │ (D-45-09)    │
 │ evento novo    │  └─────────────────┘    │ · trata as 5 FKs SET NULL  │  └──────┬───────┘
 │ (CHECK +1)     │           ▲             │ · ledger de e-mail scrub   │         │
 │ nunca nomeia   │           │             │ · marca no plano           │         ▼
 │ o candidato    │           │             └────────────────────────────┘  ┌──────────────┐
 └────────────────┘           │                          ▲                  │ recibo ao    │
                              │                          │                  │ titular      │
                    ┌─────────┴──────────────────────────┴──────────────┐   │ (tempo       │
                    │  RETOMADA: cada passo lê o estado no plano e é    │   │  passado)    │
                    │  no-op se já concluído. Nenhum passo redescobre   │   └──────────────┘
                    │  o que o passo 0 capturou.                        │
                    └───────────────────────────────────────────────────┘
```

**Como ler:** o passo 0 é o único que produz informação; os passos 1–3 só consomem o que ele gravou. É isso que torna a mutação **retomável** apesar de não-atômica — e é literalmente o ERASE-04.

### Recommended Project Structure

```
supabase/
├── migrations/
│   ├── 2026080Xnnnnnn_p45_janela_config.sql          # config singleton (D-45-01)
│   ├── 2026080Xnnnnnn_p45_pedido_exclusao.sql        # solicitacoes_dados: colunas + CHECK
│   ├── 2026080Xnnnnnn_p45_sever_user_id.sql          # DROP NOT NULL + FK → SET NULL
│   ├── 2026080Xnnnnnn_p45_plano_e_dry_run.sql        # plano_exclusao_titular() (a expressão ÚNICA)
│   ├── 2026080Xnnnnnn_p45_anonimizar_candidato.sql   # o tombstone, com p_dry_run no MESMO corpo
│   ├── 2026080Xnnnnnn_p45_bias_k5.sql                # CREATE OR REPLACE gerar_bias_snapshot
│   └── 2026080Xnnnnnn_p45_evento_notificacao.sql     # +1 valor no CHECK de evento
├── tests/
│   └── p45_motor_exclusao_smoke.sql                  # gate-GUC, asserções NEGATIVAS
└── functions/
    ├── executar-direito-titular/{index.ts,helpers.ts,index.test.ts}
    └── notificar-rh/helpers.ts                        # +1 assunto/corpo/evento
docs/compliance/
├── sql/gen-recibo-exclusao.cjs                        # gerador + --check
├── recibo-exclusao.json                               # artefato gerado
└── pii-inventory.yaml                                 # FONTE (não editar por conveniência)
src/features/
├── privacidade/{components,hooks,services}/           # ExcluirDadosBloco, ConfirmarExclusaoDialog, ReciboExclusao
└── vagas/components/RetirarCandidaturaAcao.tsx
supabase/functions/_shared/reciboExclusao.ts           # espelho .ts do artefato gerado
```

---

### Pattern 1 — Plano-primeiro, executores idempotentes (ERASE-03 + ERASE-04)

**What:** o pedido é uma máquina de estados persistida. Cada sistema tem um carimbo próprio de conclusão; nenhum passo infere o estado do outro.

**When:** sempre que a mutação atravessa fronteira sem transação compartilhada.

**Por que este projeto já sabe fazer isso:** é o `claim-before-send` de `notificacoes_enviadas` (`UNIQUE(dedupe_key)` + `INSERT ... ON CONFLICT DO NOTHING RETURNING id` **antes** de enviar) [VERIFIED: `20260721000001_notificacoes_enviadas.sql`, COMMENT da coluna `dedupe_key`], e é o passo 4-antes-do-5 de `exportar-meus-dados` [VERIFIED: `supabase/functions/exportar-meus-dados/index.ts:23-33`]: *"Se a montagem viesse primeiro, um pedido que quebrou não deixaria linha."*

**Forma sugerida das colunas novas em `solicitacoes_dados`** (todas aditivas, todas nullable, nenhuma linha viva afetada):

| Coluna | Tipo | Papel |
|---|---|---|
| `executar_em` | `timestamptz` | Fim da janela. **Predicado de execução** e fonte da data que a UI mostra |
| `cancelado_em` | `timestamptz` | Cancelamento pelo titular |
| `plano` | `jsonb` | Caminhos de Storage capturados + contagens por tabela no momento do plano |
| `storage_concluido_em` | `timestamptz` | Passo 1 |
| `postgres_concluido_em` | `timestamptz` | Passo 2 |
| `auth_concluido_em` | `timestamptz` | Passo 3 |
| `recibo_enviado_em` | `timestamptz` | Passo 4 |

`situacao` ganha valores no CHECK vivo (hoje `('atendido','pendente')` [VERIFIED: `20260804000002_p44_solicitacoes_dados.sql:105-106`]). Sugestão de vocabulário fechado: `+ 'agendado', 'cancelado', 'executando', 'concluido'`. ⚠ **Corolário obrigatório do 44:** as duas RPCs do RH filtram `tipo = 'acesso'` no servidor — confirmar que continuam filtrando, senão as linhas de exclusão aparecem em silêncio na fila de acesso (a UI-SPEC Invariante 9 proíbe).

⚠ **O `plano jsonb` guarda caminho de Storage, que embute o `auth.uid()` do titular.** Isso é PII sobrevivendo dentro do próprio registro de exclusão. O último passo do motor deve **esvaziar o `plano`** deixando só as contagens — a prova de que a exclusão aconteceu não precisa dos ponteiros para o que foi apagado.

---

### Pattern 2 — Idempotência por estado, nunca por `try/catch`

**What:** cada passo começa com `if (pedido.<sistema>_concluido_em) return 'ja_feito'`. Reexecutar um pedido concluído não muta nada e responde 200.

**Anti-forma:** apagar de novo "porque `remove()` de path inexistente não dá erro". Isso funciona por acidente e para de funcionar no dia em que o `list()` do passo 0 devolver algo novo — e nesse dia a evidência de que já tinha rodado não existe.

**Detalhe do Storage:** `remove()` apaga no máximo **1000 objetos por chamada** e `list()` pagina com `limit` (default 100) + `offset` [CITED: supabase.com/docs/guides/storage/management/delete-objects · supabase.com/docs/reference/javascript]. Com 1 CV por candidatura o volume é trivial, **mas a paginação não é opcional**: um titular com muitas re-submissões acumula objetos, e um `list()` sem loop deixa PII para trás em silêncio.

---

### Pattern 3 — O tombstone: uma transação, vereditos derivados, sentinelas que passam nas CHECKs

**What:** um RPC `anonimizar_candidato(p_candidato_id uuid, p_dry_run boolean DEFAULT true)`, `SECURITY DEFINER`, `SET search_path = ''`, que faz **toda** a metade Postgres numa transação e termina com `RAISE EXCEPTION` quando `p_dry_run` — nunca dois corpos de query.

**Vereditos por coluna** — derivados de `pii-inventory.yaml`, com a coluna "restrição medida" que o inventário **não** carrega e que decide a forma da sentinela:

| Coluna | Veredito (inventário) | Restrição medida | Tratamento viável |
|---|---|---|---|
| `candidatos.nome_completo` | `anonimizar` | `NOT NULL` | Marcador fixo — sem CHECK de formato |
| `candidatos.email` | `anonimizar` | `NOT NULL` · `UNIQUE` (`idx_candidatos_email`) · **CHECK regex de e-mail** | Sentinela **única por linha e sintaticamente válida**: `'anonimizado+'||id||'@invalido.local'` |
| `candidatos.celular` | `apagar` | **`NOT NULL`** · **CHECK `^\(\d{2}\) \d{5}-\d{4}$`** | ⚠ Não pode ser NULL nem `'[removido]'`. Só um literal **no formato**, ex. `'(00) 00000-0000'` |
| `candidatos.cpf` | `apagar` | `UNIQUE` · CHECK de formato · **nullability DIVERGE entre arquivo e catálogo** (ver §Pitfall 9) | `NULL` se a coluna for nullable no catálogo vivo; senão sentinela **no formato** e única |
| `candidatos.data_nascimento` | `anonimizar` | **`NOT NULL`** · **CHECK `< CURRENT_DATE`** | Sentinela no passado, **depois** de a faixa ter sido materializada (Pattern 6) |
| `candidatos.genero` | `anonimizar` | nullable · CHECK de allowlist | `NULL` passa (CHECK sobre NULL é NULL) |
| `candidatos.cidade` | `anonimizar` | **`NOT NULL`**, sem CHECK | Generalização/sentinela textual |
| `candidatos.estado` | `anonimizar` | **`NOT NULL`** · **CHECK: 27 UFs** | ⚠ Não existe valor "removido" válido. Ver §Pitfall 8 |
| `candidatos.user_id` | `anonimizar` (R2) | **`NOT NULL` · `UNIQUE` · FK `ON DELETE CASCADE` viva** | ⚠ **Bloqueio estrutural do ERASE-10.** Ver §Pitfall 2 |
| `decisao_final.justificativa` | D-45-02 (preservar anonimizada) | **`NOT NULL`** | `UPDATE` para texto desidentificado. **Nunca `NULL`, nunca `DELETE` da linha** |
| `decisao_final_historico.justificativa` | D-45-03 | **`NOT NULL`** | Idem — senão o histórico entrega o que a linha corrente protege |
| `historico_candidatura.ator` | `preservar` no inventário; **ERASE-10 exige severar** | `nullable` ✓ · FK `NO ACTION` = o bloqueio real do `deleteUser` | `NULL`. ⚠ Ver §Pitfall 8 sobre o efeito colateral em `auto_rejeitado` |
| `logs_acesso.ip_address` | `apagar` | **`inet NOT NULL`** | Truncar (`'0.0.0.0'::inet` ou máscara /24), nunca `NULL` |
| `autorizacoes.ip_aceite` | `anonimizar` | **`inet NOT NULL`** | Idem. É prova de aceite — a linha fica, o endereço não |
| `notificacoes_enviadas.destinatario_email` / `destinatario_original` | `apagar` | **ambos `NOT NULL`, `destinatario_original` sem default** | Sentinela. **`NULL` aborta a transação inteira** |
| `notificacoes_enviadas.dedupe_key` | `preservar` | `UNIQUE` | ⚠ Re-namespace com discriminador de purga — senão um recadastro futuro é bloqueado **em silêncio** (§Pitfall 8) |

**Regra que o executor não pode relaxar:** *nenhuma sentinela é escolhida por parecer razoável.* Cada uma é escolhida **contra a lista de constraints lida do catálogo vivo** — e o smoke tem de exercitar o caminho feliz, não só o de recusa (lição literal do `42804` da Phase 43: *"Um smoke que só exercita o caminho de recusa não é cobertura do caminho feliz, e conta como verde do mesmo jeito"* [VERIFIED: `.planning/STATE.md:464`]).

---

### Pattern 4 — Encerrar a candidatura sem mentir sobre ela (ERASE-05 / D-45-06)

Três modelagens possíveis, medidas contra os gatilhos vivos:

| Modelagem | O que quebra |
|---|---|
| `deleted_at = now()` | **Some de 5 serviços de RH** (`triagemService:133`, `candidaturasService:312/562/691`, `avaliacaoService:121`, `agendamentoService:134`) [VERIFIED: grep] — a UI-SPEC Invariante 9 proíbe. **E** `candidaturas_alem_da_janela()` filtra `c.deleted_at IS NULL` [VERIFIED: `20260801000004:184`], então a candidatura encerrada nunca entra na retenção da Phase 46 |
| Novo valor em `etapa_processo` | `ALTER TYPE ADD VALUE` é não-transacional; `v_fila_trabalho` filtra `etapa_atual NOT IN ('aprovado','rejeitado')` [VERIFIED: `20260716000003:39`] → o encerrado **continua na fila de trabalho do RH**; `candidaturas_alem_da_janela()` faz **INNER JOIN** em `config_retencao_etapa` [VERIFIED: `20260801000004:182`] → sem linha na matriz, a candidatura **desaparece da retenção em silêncio**; e **19 arquivos de `src/` referenciam valores do enum** [VERIFIED: `grep -rl entrevista_presencial src` → 19] |
| **Coluna aditiva** `encerrada_a_pedido_em timestamptz` | Não toca enum, não toca trigger, não dispara e-mail. Custo: as leituras de RH e o predicado de retenção precisam da cláusula **explícita** — mas precisariam de qualquer forma nas outras duas |

**Recomendação:** coluna aditiva, com a palavra renderizada nas superfícies de RH (UI-SPEC Invariante 9) e com a cláusula acrescentada explicitamente a `candidaturas_alem_da_janela()` na Phase 46 (registrar como dependência declarada, não descobrir lá).

⚠ **Trade-off que o plano precisa decidir e declarar:** a coluna aditiva **não escreve linha em `historico_candidatura`**, porque o trigger só dispara em `UPDATE OF etapa_atual`. E o trigger é o **único escritor** daquela tabela — invariante estabelecida no M2/Phase 6 [VERIFIED: `.planning/STATE.md:279`]. Escrever a linha à mão exigiria um RPC DEFINER que fura a invariante. As duas saídas honestas: (a) aceitar que o encerramento vive em `candidaturas` e não na trilha de etapas, documentando por quê; ou (b) furar a invariante com um escritor nomeado e auditado. **Não escolher é escolher (a) por omissão.**

---

### Pattern 5 — A janela de 15 dias como CONFIG, não como literal

D-45-01 pede "uma fonte a auditar em vez de duas a divergir". Medido: o "15" que `/rh/pedidos-dados` exibe hoje é **copy**, e `slaDados.ts` argumenta por docblock que o teto do Art. 19 II **não deve** virar constante compilada [VERIFIED: `src/features/pedidos-dados/constants/slaDados.ts:20-26`]:

> *"O Art. 19, II fixa 15 dias corridos … Isso é **teto legal**, não limiar de atenção — e por isso não existe constante numérica alguma neste arquivo … a ANPD pode dispor prazo diferenciado por setor (Art. 19 §4º) — um número compilado aqui viraria mentira silenciosa no dia em que isso acontecesse."*

**Portanto "uma fonte" significa operacionalmente:** a janela de arrependimento tem **uma** linha de config que a **copy da tela e o predicado de execução do motor leem juntos**. O molde é `config_sla_dados` — tabela singleton com `chave`, valores `integer` com CHECK, seed numa migration, leitura por RPC/`from()` [VERIFIED: `20260804000001_p44_config_sla_dados.sql:117-123,179`]. **Esta fase não edita a string de 15 dias da fila do RH** (fatos distintos que hoje coincidem).

---

### Pattern 6 — Materializar a faixa etária antes de anonimizar (ERASE-01 / SC#5)

`gerar_bias_snapshot()` deriva a idade por JOIN vivo [VERIFIED: `20260625100001_decisao_final_phase15.sql:322-331`]:

```sql
CREATE TEMP TABLE _bias_cohort ON COMMIT DROP AS
SELECT df.candidatura_id, (df.decisao = 'aprovado') AS selected,
  CASE WHEN ca.data_nascimento IS NULL THEN NULL
       ELSE date_part('year', age(ca.data_nascimento))::int END AS idade
FROM public.decisao_final df
JOIN public.candidaturas c ON c.id = df.candidatura_id
JOIN public.candidatos  ca ON ca.id = c.candidato_id;
```

**Duas saídas, e a segunda é a recomendada:**

1. **Generalizar `data_nascimento`** para uma data que preserve a faixa. Zero mudança de função para a parte da idade — mas retém o ano de nascimento, que é quase-identificador, e erra faixa em aniversariantes de fronteira.
2. **Coluna `candidatos.faixa_etaria_materializada text`** + `CREATE OR REPLACE gerar_bias_snapshot(...)` com a coluna **na frente** da derivação:
   `COALESCE(ca.faixa_etaria_materializada, <faixa derivada de data_nascimento>)`.
   A precedência importa: a sentinela escrita em `data_nascimento` (que é `NOT NULL` e tem CHECK `< CURRENT_DATE`) **cairia numa faixa real** se fosse derivada. Com a coluna na frente, a sentinela nunca é lida.
   Também é preciso que a linha tombstoneada **não** entre em `excluidos_sem_data` — hoje esse contador conta `idade IS NULL OR idade < 18`.

⚠ **A função vai ser substituída de qualquer jeito** — D-45-04 (k=5) exige. O `45-CONTEXT` §"O que NÃO pode ser tocado" nomeia o **arquivo de migration** `20260625100001` (migration aplicada é imutável, convenção do repo), não a função: o idioma vivo é `CREATE OR REPLACE` numa migration nova, exatamente como `20260803000001_p43_fix_listar_matriz_cast.sql` fez. **Isto precisa estar escrito no plano**, ou o executor lê "não pode ser tocado" e trava.

⚠ **A CHECK `ADD COLUMN`:** usar `ALTER TABLE ... ADD COLUMN faixa_etaria_materializada text` **sem `IF NOT EXISTS`**. O idioma `ADD COLUMN IF NOT EXISTS` é a causa identificada do drift mais crítico deste banco — ele silenciou a cláusula FK de `candidatos.user_id` [VERIFIED: `.planning/research/FK-AUDIT-LIVE.md:14`].

---

### Pattern 7 — O recibo derivado, com mapeamento linha → caminho de código

**What:** um gerador (`docs/compliance/sql/gen-recibo-exclusao.cjs`, molde de `gen-export-allowlist.cjs`) que lê `pii-inventory.yaml` e emite dois artefatos sob `--check`: `docs/compliance/recibo-exclusao.json` e o espelho `supabase/functions/_shared/reciboExclusao.ts`. Cada entrada carrega: item legível ao titular, coluna(s) de origem, `classificacao`, **base legal** (para a coluna "mantém") e **o identificador do passo do motor que a executa** (para a coluna "sai").

**Por que o espelho `.ts` e não import de JSON:** assunção A1 da 44-RESEARCH, fechada positivamente em produção — import estático de JSON cross-diretório pode não sobreviver ao bundler do `functions deploy` [VERIFIED: `supabase/functions/_shared/exportAllowlist.ts:11-16`].

**Como o backstop E4·error da UI-SPEC é satisfeito:** o teste confronta cada linha da coluna "sai" com o identificador de passo do motor e **falha quando existe linha sem caminho correspondente**. Uma asserção de snapshot do texto passaria numa lista honesta hoje e continuaria passando depois de o motor deixar de apagar algo.

---

## Runtime State Inventory

Fase destrutiva com mutação cross-sistema — as cinco categorias, respondidas explicitamente.

| Categoria | Itens encontrados | Ação exigida |
|---|---|---|
| **Dados armazenados** | `auth.users` (29 linhas, 0 soft-deletadas — o caminho nunca foi exercitado); `candidatos`/`candidaturas` + as 25 FKs CASCADE; as 3 FKs `NO ACTION` (`historico_candidatura`, `decisao_final`, `decisao_final_historico`); as 5 FKs `SET NULL` (`ai_call_logs` **0 linhas**, `candidate_ai_decisions` **0 linhas**, `logs_acesso`, `recruiter_alerts`, `autorizacoes`); `notificacoes_enviadas` (0 linhas em 2026-07-28, re-medir); `bias_audit_log`; `data_deletion_log` (**0 linhas**, zumbi) | Migração de dados **e** edição de código, separadamente. As 2 tabelas com 0 linhas são risco hoje teórico, débito registrado |
| **Config de serviço vivo** | 3 `cron.job` ativos: `ai-cost-aggregation`, `ai-logs-retention-cleanup` (`DELETE` vivo sobre `ai_call_logs` com o footgun `NOT IN`/NULL), `notif-retry-sweep` (`*/15`). **Nenhum toca `candidatos`.** Resend: retenção própria do processador (conteúdo ~30d, logs ~90d) fora do controle deste sistema | Nenhuma edição de cron nesta fase (é Phase 46). **Mas:** re-medir `cron.job` antes do apply — o achado de "caminho de escrita fora do repositório" continua aberto |
| **Estado registrado no SO** | **Nenhum.** Não há Task Scheduler, launchd, pm2 ou systemd neste projeto — a execução agendada é `pg_cron` dentro do banco | Nenhuma |
| **Segredos / env vars** | Vault: `resend_api_key`, `resend_webhook_secret`, `project_url`, `edge_invoke_key`. Env de projeto: `NOTIFICACOES_MODO` (**`producao` em PROD** — o smoke que enviar e-mail envia de verdade) | ⚠ **Nenhum segredo novo.** Mas o valor de `NOTIFICACOES_MODO` tem de ser lido **antes** de qualquer smoke de e-mail desta fase |
| **Artefatos de build / pacotes** | `database.types.ts` **desatualizado desde 2026-08-02** (sem `solicitacoes_dados`, `config_sla_dados`, `listar_pedidos_dados`); `supabase/.temp/` **ausente** (projeto não linkado); Supabase CLI **não instalado**; EF `exportar-meus-dados` em PROD na **v1 pré-correção** (8 commits de fix no `main`, redeploy não aconteceu) | Regenerar tipos exige `supabase login`; o débito G2 do 44 é **pré-condição do portão destrutivo**, não item paralelo |

---

## Don't Hand-Roll

| Problema | Não construir | Usar em vez disso | Por quê |
|---|---|---|---|
| Apagar arquivo do Storage | `DELETE FROM storage.objects` | `storage.from(bucket).remove(paths)` a partir de EF | Apagar por SQL remove só o metadado e **órfã o blob para sempre**. Merece grep-guard em CI, no estilo do guard de `service_role` já existente |
| Enumerar os objetos do titular | Ler só `candidaturas.curriculo_url` | `list(bucket, '<authUid>/')` **paginado**, unido a `curriculo_url` | O upload gera UUID novo a cada chamada e *"old CVs must be removed via `removeCV(path)` explicitly"* [VERIFIED: `cvUploadService.ts:102-103`] — objetos antigos existem sem linha que os aponte |
| Anonimizar | Extensão `anon` | `UPDATE` de tombstone in-place via RPC DEFINER | Não-instalável neste projeto |
| Dry-run | `SELECT count(*)` ao lado do `DELETE` real | **O mesmo corpo**, com `RAISE EXCEPTION` no fim quando `p_dry_run` | `IF p_dry_run THEN <query A> ELSE <query B>` é o parente direto do CR-02 da P39 (guard que era dead code) |
| Escapar HTML de e-mail | `escapeHtml` novo | `_shared/email-templates.ts` | Um segundo escape é um segundo escape para auditar |
| Idempotência de e-mail | Flag em memória | `UNIQUE(dedupe_key)` + claim-before-send + header `Idempotency-Key` | Provado em PROD: re-envio com a mesma chave e corpo alterado recebeu `409` do Resend |
| Destravar um `23503` | Trocar `NO ACTION` por `CASCADE` | Anonimizar a linha filha e severar o ponteiro | O 23503 é o schema fazendo o trabalho certo. É o atalho que vai ser proposto no primeiro erro — e é o que ERASE-08 proíbe |
| Ledger da exclusão | Reaproveitar `data_deletion_log` | Colunas novas em `solicitacoes_dados` | Aquela tabela não tem coluna para candidato nem para caminho, e é zumbi deferido à Phase 47 |
| Cliente Supabase destipado | `supabase as any` | Interface estreita com nome de tabela **literal** + `as unknown as` | Idioma vivo do repo (§Pitfall 10) — `as any` perde o erro de digitação no nome da tabela |

**Key insight:** nesta fase, cada "solução caseira" tem um custo assimétrico. Um escape de HTML caseiro custa um bug; um `DELETE FROM storage.objects` caseiro custa um arquivo de PII que **nenhum caminho suportado consegue mais apagar**.

---

## Common Pitfalls

### Pitfall 1 — As seis CHECK constraints de `candidatos` matam o tombstone ingênuo

**O que dá errado:** o tombstone escreve `nome_completo = '[titular removido a pedido]'`, `celular = '[removido]'`, `estado = 'XX'` — e a transação inteira aborta com `check_violation`. Como toda a metade Postgres é **uma** transação (e isso é a única atomicidade da fase), **nada** é anonimizado, mas o Storage já foi apagado no passo 1.

**Por que acontece:** o `pii-inventory.yaml` classifica *o que fazer* com cada coluna, mas não carrega as constraints. Ninguém abre o DDL de uma tabela de 2025 para escrever um `UPDATE`.

**O que existe** [VERIFIED: `docs/sql/sql/02-tabela-candidatos.sql:62-102`, verbatim]:

```sql
ADD CONSTRAINT candidatos_email_check   CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ADD CONSTRAINT candidatos_cpf_check     CHECK (cpf ~* '^\d{3}\.\d{3}\.\d{3}-\d{2}$');
ADD CONSTRAINT candidatos_celular_check CHECK (celular ~* '^\(\d{2}\) \d{5}-\d{4}$');
ADD CONSTRAINT candidatos_data_nascimento_check CHECK (data_nascimento < CURRENT_DATE);
ADD CONSTRAINT candidatos_genero_check  CHECK (genero IN ('masculino', 'feminino', 'outro', 'prefiro_nao_informar'));
ADD CONSTRAINT candidatos_estado_check  CHECK (estado IN (
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'));
```

**Como evitar:** re-medir as constraints **vivas** (`pg_constraint` sobre `public.candidatos`) antes de escrever a primeira sentinela — o arquivo é de 2025 e este banco tem drift documentado. Depois: escrever um teste que roda o tombstone contra uma linha sintética e **assere que ele completou**, não só que não lançou.

**Sinais de alerta:** o plano escreve sentinelas em prosa (`'[removido]'`) para colunas com formato. A palavra "constraint" não aparece na PLAN do tombstone.

**Confidence:** HIGH (arquivo lido) para a existência; **MEDIUM** para continuarem vivas — exige `pg_constraint`.

---

### Pitfall 2 — `candidatos.user_id` não pode ser "só apagado", e a ordem errada destrói o CV sem apagar a PII

**O que dá errado:** o ERASE-10 pede que não sobre `user_id` apontando para linha viva do Auth. A leitura natural é "seta `user_id = NULL` depois do `deleteUser`". Medido, isso é impossível **duas vezes**:

- `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE` [VERIFIED: `docs/sql/sql/02-tabela-candidatos.sql:14`], com `ON DELETE CASCADE` **confirmado vivo em `pg_constraint`** [VERIFIED: `.planning/research/FK-AUDIT-LIVE.md:14`] — o repositório de migrations diz `SET NULL` e é ficção.
- Logo `UPDATE candidatos SET user_id = NULL` viola `NOT NULL`, e `user_id = gen_random_uuid()` viola a FK (23503).

**E a sequência de falha é pior do que "não funciona":** com CASCADE vivo, `auth.admin.deleteUser` tenta apagar `candidatos` → cascateia `candidaturas` → bate nas 3 FKs `NO ACTION` → **23503** → o delete inteiro faz rollback → a API do Auth devolve `500 Database error deleting user`. Se isso acontece **depois** do passo 1, o resultado é: **currículo apagado do Storage (irrecuperável, sem PITR e sem backup de Storage) e 100% da PII do titular intacta no banco.** É o pior estado alcançável nesta fase, e hoje ele é o desfecho *garantido* de qualquer implementação que chame `deleteUser` sem tratar essa FK.

**Como evitar — três saídas, e a recomendada:**

| Saída | Efeito | Custo |
|---|---|---|
| **(S1, recomendada)** `ALTER COLUMN user_id DROP NOT NULL` + FK recriada `ON DELETE SET NULL` | O tombstone seta `NULL` (o índice UNIQUE aceita múltiplos NULLs — NULLs são distintos em Postgres). **E a FK vira rede:** um `deleteUser` fora de ordem deixa órfão em vez de cascatear | `database.types.ts` passa a `user_id: string | null`; consumidores que assumem non-null precisam de auditoria. **Reconcilia o drift** que o repo já descrevia |
| (S2) `DROP CONSTRAINT candidatos_user_id_fkey` + `user_id = gen_random_uuid()` | Satisfaz `NOT NULL` + `UNIQUE`; sem linha viva no Auth | Perde a garantia referencial para todas as linhas vivas |
| (S3) Manter tudo e apontar para um usuário "tombstone" fixo | — | ✗ **Inviável**: `UNIQUE` impede mais de um tombstone |

⚠ **Qualquer das saídas é uma migration destrutiva de schema sobre uma tabela viva.** Ela é o candidato número 1 a code review bloqueante + dry-run.

⚠ **A policy own-row de `solicitacoes_dados` depende disso** [VERIFIED: `20260804000002:186`]: `candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid()))`. Com `user_id = NULL`, o tombstone deixa de casar com qualquer sessão — que é o comportamento desejado, e vale dizê-lo no plano em vez de descobri-lo.

**Confidence:** HIGH.

---

### Pitfall 3 — As duas modelagens óbvias do "encerrar candidatura" disparam efeitos proibidos

**O que dá errado:** encerrar via `etapa_atual = 'rejeitado'` parece o caminho de menor resistência (já existe `rejeitar_candidatura` RPC). Medido, os dois ramos são inaceitáveis:

- **Com o JWT do titular** (`ator = auth.uid()`, `auto_rejeitado = false`): `avancar_etapa()` insere a linha em `historico_candidatura`, e `trg_notif_transicao` — `AFTER INSERT` naquela tabela — dispara evento `'decisao'` para `etapa_para IN ('aprovado','rejeitado') AND auto_rejeitado = false` [VERIFIED: `20260726000001_p39_rewire_triggers_aposenta_n8n.sql:76-78,121-123`]. Resultado: **um e-mail de rejeição para a pessoa que acabou de pedir para ser esquecida.**
- **Com `service_role`** (`auth.uid()` → NULL): `avancar_etapa()` grava `auto_rejeitado := (v_ator IS NULL)` = `true` [VERIFIED: `20260607000005_avancar_etapa_trigger.sql:26,58`]. Não dispara e-mail — mas **fabrica, na tabela cuja função é provar que nenhum candidato é rejeitado automaticamente, o registro de uma rejeição automática.** É a RNF-07a invertida pelo próprio motor de compliance.

**Como evitar:** Pattern 4. E, para qualquer caminho escolhido, o teste tem de ser uma **asserção negativa**: com o encerramento executado, `notificacoes_enviadas` não ganha linha de evento `'decisao'` para aquela candidatura, e `historico_candidatura` não ganha linha com `auto_rejeitado = true`.

**Sinais de alerta:** a PLAN reusa `rejeitar_candidatura`. A palavra "rejeitado" aparece no caminho do encerramento.

**Confidence:** HIGH.

---

### Pitfall 4 — Enumerar o Storage por `curriculo_url` deixa PII para trás

**O que dá errado:** o passo 0 coleta os caminhos lendo `candidaturas.curriculo_url`. Parece completo e não é: o upload gera **UUID novo a cada chamada**, nunca sobrescreve, e a remoção do antigo é responsabilidade explícita de quem chama [VERIFIED: `src/features/vagas/services/cvUploadService.ts:102-103,130-137`]. Todo CV substituído sem `removeCV()` continua no bucket, sem linha que o aponte — e passa incólume por uma exclusão que "funcionou".

**Como evitar:** a enumeração autoritativa é `list(bucket, '<authUid>/')` **com paginação**, unida (não substituída) por `curriculo_url` como conferência cruzada. Uma divergência entre as duas listas é achado, não ruído: significa objeto órfão ou ponteiro morto.

**Sinais de alerta:** o plano tem uma única fonte de caminhos. Ninguém sabe dizer quantos objetos existem sob o prefixo de um titular.

**Confidence:** HIGH (código) + MEDIUM (semântica do bucket em PROD — exige sonda).

---

### Pitfall 5 — O recibo derivado da fonte errada afirma menos do que o motor faz

**O que dá errado:** o recibo é derivado de `exportAllowlist.ts`, que a UI-SPEC nomeia. Ele cobre 30 de 69 tabelas (§C2). As oito tabelas de `telemetria_interna` que guardam dado do titular — inclusive `logs_acesso` e `ai_call_logs`, duas das cinco do ERASE-09 — não aparecem em coluna nenhuma. O recibo fica **honesto sobre o que diz e omisso sobre o que não diz**, que é o modo de falha específico que a Invariante 4 da UI-SPEC quer evitar.

**Como evitar:** Pattern 7 — derivar de `pii-inventory.yaml`, e fazer o gerador **falhar** quando existir tabela do catálogo sem veredito.

**Confidence:** HIGH.

---

### Pitfall 6 — `p_periodo` de `gerar_bias_snapshot()` é um rótulo, não um filtro

**O que dá errado:** a leitura natural de SC#5 ("a série continua produzindo os mesmos números para os períodos anteriores") é "reexecutar o snapshot de um período passado devolve o mesmo resultado". Medido, isso **nunca foi verdade**: a coorte não tem cláusula de período nenhuma — `p_periodo` só é gravado em `bias_audit_log.periodo`, e o `CREATE TEMP TABLE _bias_cohort` agrega **toda** `decisao_final` [VERIFIED: `20260625100001_decisao_final_phase15.sql:322-331,417-419`].

**O que SC#5 pode significar operacionalmente, então:** (a) as linhas já gravadas em `bias_audit_log` permanecem intactas — e permanecem, porque não há FK de `bias_audit_log` para `candidatos`; e (b) a **composição da coorte** não muda por causa da anonimização — que é exatamente o que a materialização da faixa garante.

⚠ **Tensão declarada com D-45-04:** acrescentar supressão k=5 **muda** o que um snapshot novo publica. Se alguém interpretar SC#5 como "o output da função não muda", D-45-04 e SC#5 são incompatíveis. A leitura coerente é: **as linhas históricas não mudam; a apresentação futura suprime células pequenas.** O plano tem de escrever essa leitura, porque a verificação vai perguntar.

**Confidence:** HIGH.

---

### Pitfall 7 — k=5 sem supressão complementar não suprime nada

**O que dá errado:** suprimir a contagem da faixa `18-24` (n=3) e continuar publicando `n_total` e as outras quatro faixas. O leitor subtrai e recupera o 3. É o defeito canônico do controle de divulgação estatística: *"A supressão das células primárias sozinha pode ser facilmente atacada pelos totais marginais; é portanto necessário suprimir células adicionais, chamadas complementares"* [CITED: nces.ed.gov/FCSM/pdf/2005FCSM_Dandekar_IXA.pdf · sdctools.github.io/HandbookSDC].

O `dados jsonb` atual publica **exatamente** os campos que fecham a conta: `bands[]` com `applicants`/`selected` por faixa, mais `n_total` e `excluidos_sem_data` [VERIFIED: `20260625100001:406-417`].

**Como evitar:** quando qualquer faixa for primária-suprimida, suprimir também **ou** `n_total` **ou** uma segunda faixa (a de menor contagem entre as restantes). E decidir explicitamente o que acontece com `selection_rate`, `razao_4_5`, `flag` e `faixa_referencia` de uma faixa suprimida — publicar a razão 4/5 de uma célula suprimida devolve a contagem por outro caminho quando `selected` é pequeno.

**Sinais de alerta:** o corpo novo tem um `IF applicants < 5` e mais nada. `n_total` continua sendo publicado sem condição.

**Confidence:** HIGH (literatura convergente) · a escolha da forma exata é discricionária.

---

### Pitfall 8 — Os efeitos colaterais silenciosos da severação

Quatro, todos invisíveis a um teste que só verifica que o dado sumiu.

1. **`historico_candidatura.ator = NULL` faz a linha parecer escrita pelo sistema.** `auto_rejeitado` é boolean **armazenado** (calculado no INSERT), então a prova RNF-07a sobrevive ✓ — mas qualquer leitor que derive "foi o sistema" de `ator IS NULL` passa a mentir. Isso morde diretamente o W-1/CONSOL-02 da Phase 47 (renderizar o nome do recrutador em vez do UUID). Precisa de marcador distinto ou de decisão registrada.
2. **`dedupe_key` preservada bloqueia o recadastro em silêncio.** O formato é `{evento}:{candidatura_id}:{discriminador}`; com o `candidato_id` preservado no tombstone, um recadastro futuro pode colidir, e o claim `ON CONFLICT DO NOTHING RETURNING id` volta vazio → **o e-mail legítimo nunca é enviado, sem erro em lugar nenhum**. Re-namespace na anonimização.
3. **`candidatos.estado` não tem valor "removido" válido.** A CHECK aceita 27 UFs e a coluna é `NOT NULL`. O inventário justifica preservar dizendo que "granularidade UF é útil ao bias snapshot" — mas o snapshot **não lê `estado`** (verificado: usa só `data_nascimento`). Ou seja: hoje seria PII retida **sem consumidor**. Decidir explicitamente entre alterar a CHECK, alterar a nullability, ou registrar a retenção com base legal.
4. **`ai_call_logs` e `candidate_ai_decisions` estão com 0 linhas.** O tratamento delas é hoje não-exercitável em PROD. Isso é bom para o risco e ruim para a evidência: o smoke não consegue provar que o tratamento funciona sem fixture sintética. Não deixar isso virar "verde por vacuidade".

**Confidence:** HIGH para 1–3 · HIGH para 4 (contagens em `FK-AUDIT-LIVE.md:131-132`, re-medir).

---

### Pitfall 9 — O arquivo de DDL diverge do catálogo vivo, e a divergência já está medida

`docs/sql/sql/02-tabela-candidatos.sql:19` declara `cpf VARCHAR(14) NOT NULL UNIQUE`. O `database.types.ts` gerado do catálogo vivo declara `cpf: string | null` [VERIFIED: `database.types.ts:837`]. O arquivo também não conhece `linkedin` nem `instagram` (só as variantes `_url`), que existem no tipo gerado.

**Consequência:** o mapa de nullability do tombstone **não pode ser lido dos arquivos**. Tem de sair de `information_schema.columns` ao vivo — mesma regra de precedência que o `FK-AUDIT-LIVE.md` já estabeleceu para `ON DELETE`, aplicada agora a `is_nullable` e `check_constraints`.

**Confidence:** HIGH.

---

### Pitfall 10 — Tocar `solicitacoes_dados` pelo cliente tipado quebra o `tsc` e o portão de "zero `--no-verify`"

`database.types.ts` não conhece `solicitacoes_dados` (§C3). Qualquer `supabase.from('solicitacoes_dados')` novo eleva a contagem `tsc` acima de 97 → o `.husky/pre-commit` **reprova**, corretamente. E como esta é fase destrutiva, `--no-verify` está proibido.

**A saída já existe no repo** e é deliberadamente estreita [VERIFIED: `src/features/privacidade/services/exportacaoService.ts:766-792`, verbatim]:

```ts
interface ClienteSolicitacoesDados {
  from(tabela: 'solicitacoes_dados'): ConsultaUltimoPedido
}
const clienteSolicitacoes = supabase as unknown as ClienteSolicitacoesDados
```

O docblock explica por que não é um cliente destipado: *"O nome da tabela continua LITERAL no tipo — um erro de digitação nele ainda não compila. E a conversão é do **objeto** cliente, nunca a extração do método: extrair perde o `this` e derruba o `PostgrestClient` em runtime, defeito que os testes NÃO pegam porque mockam o método inteiro."*

**Como evitar:** reusar esse idioma para as colunas/RPCs novas, **ou** regenerar os tipos (exige `supabase login`; o script usa `>` que **trunca antes de executar**, então gerar para arquivo temporário primeiro — lição da P37/37-05).

**Confidence:** HIGH.

---

### Pitfall 11 — Um RPC `SECURITY DEFINER` novo nasce executável por `anon`, com guard que falha aberto

`pg_default_acl` do schema `public` concede EXECUTE a `anon` e `authenticated` como grants **diretos e nomeados**, então `REVOKE ALL ... FROM PUBLIC` — o idioma de quase toda migration deste repo — **não remove nada** [VERIFIED: `docs/compliance/anon-execute-definer-audit.md:11-18`]. Hoje há **61 funções DEFINER em `public` com EXECUTE para `anon`**, 39 chamáveis por PostgREST.

E o guard idiomático é NULL-cego: `IF v_role NOT IN ('rh','administrador')` com `v_role` NULL avalia NULL, o `IF` **não é tomado**, e o guard só recusa claim *presente-e-errada* — deixando passar o chamador **sem JWT nenhum**, que é exatamente o `anon`. Em `SECURITY DEFINER` isso é grave porque DEFINER **bypassa RLS** e o guard do corpo é o único controle.

**Como evitar, obrigatoriamente, em toda função nova desta fase:**
```sql
REVOKE ALL ON FUNCTION public.<fn>(...) FROM PUBLIC, anon, authenticated;
```
e guard NULL-safe por `IS DISTINCT FROM` / `coalesce(...)`, mais rejeição explícita de `auth.uid() IS NULL`. O precedente correto é `previa_retencao()` [VERIFIED: `20260801000004:290-292`] e o `REVOKE ... FROM PUBLIC, anon, authenticated` de `candidaturas_alem_da_janela()` [VERIFIED: `20260801000004:216-217`].

**Confidence:** HIGH.

---

### Pitfall 12 — O recibo por e-mail escreve o endereço do titular na coluna criada para preservá-lo

Este é o problema aberto que a UI-SPEC criou e deixou explicitamente para o plano. Medido, ele é **mais duro** do que a UI-SPEC descreve:

`notificacoes_enviadas` tem `destinatario_email text NOT NULL` **e** `destinatario_original text NOT NULL` sem default [VERIFIED: `20260721000001:82` e `20260722000002:100-105`] — o endereço é gravado **duas vezes por linha** — e **`candidatura_id uuid NOT NULL`** + **`candidato_id uuid NOT NULL`**, ambos com FK `ON DELETE CASCADE` [VERIFIED: `20260721000001:78-79`]. Ou seja: o recibo de exclusão é um evento **de conta**, e a tabela onde ele "deveria" ser registrado exige uma candidatura.

**Três saídas, com o que cada uma custa:**

| Saída | Efeito | Custo |
|---|---|---|
| **(R1, recomendada)** O recibo **não** entra em `notificacoes_enviadas`. A prova de envio é `solicitacoes_dados.recibo_enviado_em`; a idempotência é essa coluna + header `Idempotency-Key` no Resend | Elimina o problema na origem: nenhum endereço do titular é persistido pelo recibo | Perde o ledger de entrega (bounce/reclamado) para este e-mail específico. Aceitável: o recibo não tem retry útil — depois do hard delete não há a quem re-tentar |
| (R2) Ledger normal + anonimização das linhas do titular como **último passo** do RPC | Preserva o ledger e o `dedupe_key` | Precisa de `candidatura_id` arbitrário (mentira estrutural), e a linha do próprio recibo teria de ser anonimizada **depois** de gravada — janela em que a PII existe |
| (R3) Tornar `candidatura_id` nullable | Modela a verdade | Migration sobre a tabela mais quente do M7, com RLS join-through que usa `candidatura_id` no predicado [VERIFIED: `20260721000001`, policy `rh_le_notificacoes`] — um NULL ali muda a semântica da policy |

⚠ **Independente da saída escolhida, as linhas de ledger PREEXISTENTES do titular precisam de tratamento** (o inventário classifica `destinatario_email`/`destinatario_original` como `apagar`), com sentinela — **`NULL` viola `NOT NULL` e aborta a transação de anonimização inteira**.

⚠ **E o endereço tem de ser lido ANTES do tombstone e usado DEPOIS do `deleteUser`** (o recibo é em tempo passado e afirma que a conta não existe mais). Duas formas: manter em variável local da EF (simples, mas **não sobrevive a um crash** → recibo perdido, registrar `causa`), ou persistir no `plano` e limpar no fecho (retomável, ao custo de PII de curta vida dentro do próprio pedido). Coerente com a filosofia do ERASE-04, a segunda é a mais defensável — e deve ser **decidida no plano, não no código**.

**Confidence:** HIGH para o schema · a escolha é de projeto.

---

## Code Examples

### Dry-run pela MESMA expressão — o molde vivo que a fase deve clonar

```sql
-- Fonte: supabase/migrations/20260801000004_p43_previa_retencao.sql:174-202 (COMMENT verbatim, 226-232)
CREATE OR REPLACE FUNCTION public.candidaturas_alem_da_janela()
RETURNS TABLE (candidatura_id uuid, candidato_id uuid, etapa public.etapa_processo)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $candidaturas_alem_da_janela$ ... $candidaturas_alem_da_janela$;

REVOKE ALL ON FUNCTION public.candidaturas_alem_da_janela()
  FROM PUBLIC, anon, authenticated;
```

> COMMENT vivo: *"SE VOCE VEIO DA PHASE 46 PARA ESCREVER O DELETE (PURGA-02): CHAME ESTA FUNCAO, nao copie o corpo. O dry-run e o delete real TEM de sair da mesma expressao; um dry-run que diverge do predicado e decoracao (precedente: P39 CR-02, uma guarda que era dead code). O smoke supabase/tests/p43_previa_smoke.sql pina o md5(prosrc) desta funcao e assere que os wrappers a CHAMAM — uma segunda copia reprova o gate."*

**Transposição para a Phase 45:** `plano_exclusao_titular(p_candidato_id uuid)` `STABLE SECURITY DEFINER` devolve o plano (contagens por tabela + caminhos de Storage); `anonimizar_candidato(p_candidato_id uuid, p_dry_run boolean)` **chama** essa função e, no fim do mesmo corpo, `IF p_dry_run THEN RAISE EXCEPTION 'dry_run' USING ERRCODE = '...'`. Smoke pina `md5(prosrc)` das duas e assere a chamada.

### Guard NULL-safe + REVOKE nominal (obrigatório em toda função nova)

```sql
-- Fonte: supabase/migrations/20260801000004_p43_previa_retencao.sql:285-292
BEGIN
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode ler a previa de retencao'
      USING ERRCODE = '42501';
  END IF;
```

### EF privilegiada — authenticate-THEN-authorize (D-23 two-client)

```ts
// Fonte: supabase/functions/get-curriculo-url/index.ts (docblock + handler)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // import ESTÁTICO

export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  const { supabaseAdmin, supabaseUser } = deps;
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  // ... só DEPOIS de autorizar é que supabaseAdmin toca dado
}
```

### Ponte de tipos para tabela ausente do `database.types.ts`

```ts
// Fonte: src/features/privacidade/services/exportacaoService.ts:780-792 (verbatim)
interface ClienteSolicitacoesDados {
  from(tabela: 'solicitacoes_dados'): ConsultaUltimoPedido
}
const clienteSolicitacoes = supabase as unknown as ClienteSolicitacoesDados
```

### Storage — enumerar e apagar (o único caminho que apaga o blob)

```ts
// Paths: `{authUid}/{uuid}.pdf`  (cvUploadService.ts:130-131)
let offset = 0; const paths: string[] = [];
for (;;) {
  const { data, error } = await admin.storage.from('curriculos')
    .list(`${authUid}`, { limit: 100, offset });          // paginação NÃO é opcional
  if (error) throw error;
  if (!data?.length) break;
  paths.push(...data.map((o) => `${authUid}/${o.name}`));
  if (data.length < 100) break;
  offset += 100;
}
// grava `paths` no plano ANTES de qualquer mutação (ERASE-04)
const { error: rmErr } = await admin.storage.from('curriculos').remove(paths); // ≤1000/chamada
if (rmErr) throw rmErr;                                    // verificar o retorno é parte do passo
```

---

## State of the Art

| Abordagem antiga | Abordagem atual | Quando mudou | Impacto |
|---|---|---|---|
| `storage.objects.owner` com FK para `auth.users` (a "imposição de plataforma" que bloqueia `deleteUser`) | `owner_id text`, sem FK; `owner` **deprecada** | Supabase Storage, versão não datada nas docs | A ordem Storage→Auth continua obrigatória, mas **por razões nossas**, não por proteção da plataforma (§C4) |
| `.husky/pre-commit` binário sobre exit code do `tsc` | Gate de **não-regressão** contra baseline congelada (97) | Phase 42 / 42-01 | "Zero `--no-verify`" passa a ser satisfazível honestamente |
| `notificar-candidato` como única EF de e-mail, com vocabulário fechado compartilhado | `notificar-rh` como EF própria desde a Phase 42; `_shared/email-config.ts:40-51` **proíbe por docblock** rótulo de RH na união `EventoNotificacao` | Phase 42 | O arquivo dos 2 CRITICAL **não é tocado** nesta fase |
| Extensão `anon` como primitivo de anonimização | Tombstone `UPDATE` in-place via RPC DEFINER | M8 kickoff (medido ao vivo) | Promovido de MEDIUM a HIGH pelo `FK-AUDIT-LIVE` |
| Backup como rede de segurança | **Não existe rede.** 7 dias de backup diário, sem PITR, e Storage fora de qualquer caminho de backup | D-45-10, datado 2026-08-04 | O dry-run **é** o mecanismo de segurança |

**Deprecado / não usar:**
- `data_deletion_log` como ledger de exclusão de candidato — repropositada para rollback de prompts; nome mente. Phase 47.
- `shouldSoftDelete: true` para exclusão LGPD — retém o e-mail em `auth.users`, e o índice único vivo é parcial em `is_sso_user = false`, não em `deleted_at IS NULL` (D-45-09).
- `select('*')` em qualquer caminho desta fase — reincidência nº 1 deste codebase.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | As 6 CHECK constraints de `candidatos` do arquivo de 2025 **continuam vivas** no catálogo | Pitfall 1 | Sentinela escolhida contra constraint inexistente (inofensivo) — ou constraint NOVA não prevista aborta a transação de anonimização no primeiro pedido real |
| A2 | O índice `idx_candidatos_email` / `idx_candidatos_cpf` / `idx_candidatos_user_id` continuam UNIQUE em PROD | Pattern 3 | Sentinela não-única colide na segunda exclusão |
| A3 | `storage.objects` deste projeto usa `owner_id` (sem FK bloqueadora) | §C4 | Se a FK existir, o `deleteUser` falha por um motivo a mais — e a mensagem será opaca (`500 Database error deleting user`) |
| A4 | Os objetos do bucket `curriculos` estão todos sob o prefixo `{authUid}/` | Pitfall 4 | Uma convenção de pasta diferente (a hipótese que o n=3 do M5 não excluía) deixa CVs para trás. O item 8 da §Deferred Verification do 44-07 é justamente isto |
| A5 | `notificacoes_enviadas` continua com poucas/zero linhas em PROD | Runtime State Inventory | O tratamento do ledger vira volume real, com custo de transação |
| A6 | Nenhum `cron.job` novo apareceu em PROD desde 2026-07-29 | Runtime State Inventory | Um job de purga fora do repositório roda contra o motor novo |
| A7 | O `NOTIFICACOES_MODO` de PROD continua `producao` | Runtime State Inventory | Um smoke de e-mail desta fase envia e-mail real a 5 pessoas |
| A8 | A leitura de que SC#5 fala das **linhas gravadas** em `bias_audit_log`, não do output da função | Pitfall 6 | O verificador reprova a fase por uma incompatibilidade entre SC#5 e D-45-04 que é de interpretação, não de código |
| A9 | Severar `candidatos.user_id` (S1) não quebra consumidor que assume non-null | Pitfall 2 | Regressão de `tsc` acima da baseline 97 e/ou runtime error em leitura de perfil |

---

## Open Questions

1. **`shouldSoftDelete` — o que ainda é incognoscível, e por que não importa mais**
   - **O que sabemos:** a assinatura é `deleteUser(id, shouldSoftDelete)`, `service_role`-only, default `false` [CITED: supabase.com/docs/reference/javascript/auth-admin-createuser]. A doc acrescenta que o soft delete **não é reversível** e *"allows for identification via the hashed user ID"* — o que sugere alguma ofuscação, sem dizer qual.
   - **O que continua sem documentação:** se o e-mail é liberado para recadastro após soft delete. É a lacuna do `supabase/supabase#20057`.
   - **Por que deixou de bloquear:** D-45-09 já escolheu hard delete, **e a escolha foi medida, não assumida** — o índice único vivo é parcial em `is_sso_user = false`, então uma linha soft-deletada continuaria ocupando o slot do e-mail. Hard delete torna a incógnita irrelevante por desenho.
   - **A sonda que AINDA vale a pena**, e é outra: **hard delete de um usuário descartável com histórico de funil**, para medir se o `23503` do Pitfall 2 acontece de fato e como a Admin API o reporta. Protocolo: (i) criar conta descartável; (ii) criar candidatura e forçar uma transição (gera `historico_candidatura.ator`); (iii) subir um arquivo no bucket; (iv) chamar `deleteUser(id)` **sem** severar nada e registrar o corpo do erro; (v) severar `ator` e `user_id` e repetir; (vi) apagar tudo. **Read-only não serve — esta sonda escreve, e por isso é checkpoint do orquestrador em ambiente controlado, nunca sobre conta real.**

2. **Qual das três saídas do `user_id` (S1/S2/S3)?** Decisão de schema sobre tabela viva, com efeito em `database.types.ts` e possivelmente na baseline `tsc`. Recomendação: S1. **Precisa de code review bloqueante antes do apply.**

3. **`candidatos.estado` — retenção sem consumidor.** Alterar a CHECK, alterar a nullability, ou registrar base legal para reter a UF? Hoje o consumidor citado (bias snapshot) não a lê.

4. **Recibo: R1, R2 ou R3?** (Pitfall 12). Recomendação: R1.

5. **`historico_candidatura` ganha linha para o encerramento?** (Pattern 4). Exige furar a invariante "o trigger é o único escritor" ou aceitar que o encerramento não vive na trilha de etapas.

6. **O portão destrutivo exige G1 e G2 do 44 fechados antes do apply** (`STATE.md:510-514`). G2 (redeploy da EF `exportar-meus-dados`, hoje em v1 pré-correção) exige `supabase login` — ver §Environment Availability. **Isso não bloqueia planejar; bloqueia aplicar.**

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node | geradores, testes, scripts | ✓ | 24.18.0 | — |
| npm / npx | build, Vitest, `check:*` | ✓ | 11.16.0 | — |
| Deno | testes das Edge Functions | ✓ | 2.9.4 | — |
| git | commits do portão destrutivo | ✓ | 2.50.1 | — |
| **Supabase CLI** | `db:types`, `functions deploy` (G2) | ✗ | — | **`npx supabase` + `supabase login`** (o `db:types` já usa `npx`); apply de migration continua por MCP |
| **`supabase/.temp/` (projeto linkado)** | `gen types --linked`, `db push` | ✗ | — | `gen types --project-id`, ou `supabase link` (resolveu sem prompt na P37/37-05) |
| `SUPABASE_ACCESS_TOKEN` | Management API (PITR, backups) | ✗ | — | Dashboard pelo operador. **Sem ele o status de backup não é verificável por agente** |
| psql | — | ✗ | — | Não necessário: SQL vai por MCP |
| **MCP Supabase (`apply_migration`, `execute_sql`, `deploy_edge_function`)** | toda migration, toda inspeção PROD, todo deploy | ✓ **só no orquestrador** | — | **Nenhum.** Subagentes GSD não recebem esses tools (bug upstream anthropics/claude-code#13898) |

**Missing dependencies with no fallback:**
- **MCP Supabase dentro de subagente.** Consequência de planejamento de wave, não descoberta de meio de fase: **toda** tarefa que toque PROD é `checkpoint` do orquestrador. Uma wave que misture "escrever a migration" com "aplicar a migration" **não pode fechar**.
- `SUPABASE_ACCESS_TOKEN` para verificar a postura de backup — mas D-45-10 já decidiu (PITR desligado), então a verificação é registro, não bloqueio.

**Missing dependencies with fallback:**
- Supabase CLI → `npx supabase` (com `login`). Necessário para G2 e para regenerar tipos. ⚠ `npm run db:types` usa `>`, que **trunca o arquivo antes de executar** — gerar para temporário primeiro (lição P37/37-05).

**Sondas de PROD que o orquestrador deve rodar ANTES de a primeira migration ser escrita** (todas read-only):

```sql
-- (1) constraints e nullability VIVAS de candidatos — mata o Pitfall 1 e o Pitfall 9
SELECT column_name, is_nullable, data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name='candidatos' ORDER BY ordinal_position;
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.candidatos'::regclass ORDER BY contype, conname;

-- (2) FKs de storage.objects — fecha o §C4 (a "imposição de plataforma")
SELECT c.conname, a.attname, c.confrelid::regclass::text,
       CASE c.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'c' THEN 'CASCADE'
            WHEN 'n' THEN 'SET NULL' ELSE c.confdeltype::text END AS on_delete
  FROM pg_constraint c
  JOIN unnest(c.conkey) WITH ORDINALITY k(attnum,ord) ON TRUE
  JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum
 WHERE c.contype='f' AND c.conrelid='storage.objects'::regclass;

-- (3) os objetos existem e sob qual prefixo? (A4)
SELECT bucket_id, count(*), min(name), max(name) FROM storage.objects GROUP BY bucket_id;

-- (4) re-confirmar o grafo de FK do FK-AUDIT-LIVE (coletado em 2026-07-29)
--     e as contagens vivas de ai_call_logs / candidate_ai_decisions / notificacoes_enviadas

-- (5) cron.job vivo vs. repositório (A6) e NOTIFICACOES_MODO (A7)
SELECT jobname, schedule, active, left(command, 120) FROM cron.job ORDER BY jobname;
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | **Vitest** (config inline em `vite.config.ts`, bloco `test`) · **Deno test** para Edge Functions · **smokes SQL** em `supabase/tests/` |
| Config file | `vite.config.ts` (`environment: 'happy-dom'`, `setupFiles: ['./tests/setup.ts']`, `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`) |
| Quick run command | `npx vitest run src/features/privacidade` (ou o caminho do arquivo tocado) |
| Full suite command | `npm run test:run` · `npm run lint` · `npm run build` (com `postbuild`: `assert-no-secrets` + `assert-chunks`) · `npm run check:export-allowlist` |
| EF tests | `deno test` sobre `supabase/functions/**` (excluídos do Vitest por `https:`/`npm:` specifiers) |
| Smokes SQL | Executados por MCP `execute_sql` numa **única chamada** (`set_config(..., false)` é escopado à sessão — statements em chamadas separadas zeram o contador) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| ERASE-01 | Snapshot roda antes da 1ª anonimização; faixa materializada sobrevive ao tombstone | smoke SQL | `execute_sql` de `supabase/tests/p45_motor_exclusao_smoke.sql` (gate-GUC) | ❌ Wave 0 |
| ERASE-01 / D-45-04 | k=5 suprime **e** a supressão complementar impede a subtração | smoke SQL + unit | idem + `npx vitest run src/features/privacidade` | ❌ Wave 0 |
| ERASE-02 | Tombstone completa contra **todas** as CHECKs e NOT NULLs; re-run é no-op | smoke SQL (caminho FELIZ, não só recusa) | idem | ❌ Wave 0 |
| ERASE-03 | Ordem `Storage → Postgres → Auth`; cada passo idempotente | unit (Deno, `deps` mockados) | `deno test supabase/functions/executar-direito-titular/` | ❌ Wave 0 |
| ERASE-04 | Caminhos capturados antes da 1ª mutação; retomada não redescobre | unit (Deno) | idem | ❌ Wave 0 |
| ERASE-05 | Distinção legível; `stopPropagation` no card clicável | unit (Vitest, evento **no elemento**, com bubbling) | `npx vitest run src/features/vagas` | ❌ Wave 0 |
| ERASE-05 / D-45-06 | **Negativa:** encerrar NÃO gera evento `'decisao'` nem `auto_rejeitado = true` | smoke SQL | `p45_motor_exclusao_smoke.sql` | ❌ Wave 0 |
| ERASE-06 | Janela lida da config; cancelamento não reabre candidatura | unit + smoke | `npx vitest run src/features/privacidade` | ❌ Wave 0 |
| ERASE-07 | Cada linha "sai" mapeia a um passo do motor; gerador `--check` verde | unit (Node) | `node docs/compliance/sql/gen-recibo-exclusao.cjs --check` | ❌ Wave 0 |
| ERASE-08 | **Negativa:** contagem INALTERADA em `historico_candidatura`, `decisao_final`, `decisao_final_historico`; **nenhuma** FK relaxada para CASCADE | smoke SQL sobre `pg_constraint` + contagens antes/depois | `p45_motor_exclusao_smoke.sql` | ❌ Wave 0 |
| ERASE-09 | As 5 tabelas `SET NULL` tratadas; fixture sintética para as 2 com 0 linhas | smoke SQL | idem | ❌ Wave 0 |
| ERASE-10 | **Negativa:** zero `candidatos` com `user_id` que exista em `auth.users` após execução; zero `historico_candidatura.ator` apontando ao titular | smoke SQL | idem | ❌ Wave 0 |
| E-mail (D-45-08) | Assunto neutraliza CR/LF; corpo **sem** nome/CPF/`candidato_id`/`solicitacao_id` | unit (Deno, fixture com todos os valores presentes) | `deno test supabase/functions/notificar-rh/` | parcial (molde da P42 existe) |
| Copy (UI-SPEC) | Bans **no escopo declarado**; coocorrência do qualificador de cancelamento | unit (Vitest) | `npx vitest run src/features/privacidade` | ❌ Wave 0 |

### Sampling Rate

- **Por commit de tarefa:** `npx vitest run <caminho tocado>` + `npm run lint` (o hook conta e compara contra 97).
- **Por merge de wave:** `npm run test:run` + `npm run lint` + `npm run build` + `npm run check:export-allowlist` + o `--check` do gerador do recibo.
- **Portão de fase:** suíte inteira verde **e** os 5 itens do portão destrutivo: `VERIFICATION.md` com veredito · code review **bloqueante antes** do apply em PROD · **asserções negativas** · **zero `--no-verify`** · dry-run pela **MESMA query** exercitado.

### Wave 0 Gaps

- [ ] `supabase/tests/p45_motor_exclusao_smoke.sql` — gate-GUC no idioma do `p43_previa_smoke.sql`, cobrindo ERASE-01/02/08/09/10 com asserções **negativas** e **exercitando o caminho feliz do tombstone**, não só a recusa
- [ ] `supabase/functions/executar-direito-titular/index.test.ts` — `handler(req, deps)` com `deps` mockados, sem `--allow-net` (molde do 41-01)
- [ ] `docs/compliance/sql/gen-recibo-exclusao.cjs` + `--check` no `package.json`
- [ ] Fixture sintética para `ai_call_logs` e `candidate_ai_decisions` (0 linhas em PROD → verde por vacuidade se não houver fixture)
- [ ] Teste de mis-tap do `RetirarCandidaturaAcao` disparando evento **no elemento** com bubbling real (um teste que invoca o handler direto passa com o defeito presente)
- [ ] Teste de re-identificação como gate: após anonimizar um candidato sintético, tentar reencontrá-lo por (faixa etária + UF + vaga + timestamp). **Achou 1 linha → a anonimização falhou.**

---

## Security Domain

`/gsd-secure-phase` é **obrigatório** nesta fase (`service_role`, Storage Admin, Auth Admin, mutação cross-sistema sobre PII viva).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V1 Architecture | **yes** | authenticate-THEN-authorize em EF; `service_role` **jamais** no cliente; toda operação privilegiada atrás de EF |
| V2 Authentication | **yes** | Titular resolvido **sempre** de `auth.uid()` no servidor; **nunca** aceito do corpo (classe T-32-03). Considerar re-autenticação recente antes de uma ação irreversível |
| V3 Session Management | **yes** | `sessoes_ativas` é CASCADE para `auth.users`; a credencial morre com o Auth. Ordem: nenhuma sessão pode sobreviver ao hard delete |
| V4 Access Control | **yes** | RLS own-row em `solicitacoes_dados`; **zero policy de escrita para o candidato**; `REVOKE ... FROM PUBLIC, anon, authenticated` em toda função nova; guard **NULL-safe** por `IS DISTINCT FROM` (§Pitfall 11) |
| V5 Input Validation | **yes** | Vocabulário fechado em CHECK no banco **e** no código; nenhum caminho de Storage vindo do cliente |
| V6 Cryptography | parcial | Nenhum hash caseiro. Se algum sentinel usar hash, **HMAC com chave do Vault** (`pgcrypto` 1.3 vivo) — hash simples de e-mail é reversível por dicionário |
| V7 Error Handling & Logging | **yes** | Nenhum valor interno vaza ao titular (UI-SPEC Invariante 12); `causa` é vocabulário fechado, **nunca** mensagem crua/SQLSTATE/caminho de Storage; URL assinada nunca em `console.*` |
| V8 Data Protection | **yes** | Allowlist explícita, **nunca `select('*')`**; `plano jsonb` esvaziado no fecho; endereço do recibo tratado por §Pitfall 12 |
| V12 Files & Resources | **yes** | Storage Admin API como único caminho de exclusão; grep-guard contra `DELETE FROM storage.objects` |
| V13 API & Web Service | **yes** | EF com `verify_jwt: true`; `COOLDOWN` como código próprio (não 403) |

### Known Threat Patterns for `Deno EF + service_role + Supabase Storage + Postgres RLS`

| Padrão | STRIDE | Mitigação padrão |
|---|---|---|
| Titular forjado no corpo do request | Spoofing / Elevation | Resolver de `auth.uid()` no servidor (T-32-03) |
| EF autentica mas não autoriza | Elevation | Guard de titularidade **antes** de qualquer leitura privilegiada |
| DEFINER chamável por `anon` com guard NULL-cego | Elevation | `REVOKE` nominal + `coalesce`/`IS DISTINCT FROM` + rejeitar `auth.uid() IS NULL` |
| `select('*')` em EF com `service_role` | Information Disclosure | Allowlist por coluna; RLS **não** protege coluna |
| Injeção de header de e-mail via título de vaga | Tampering | Neutralizar CR/LF (molde `assuntoRevisaoSolicitada`) |
| Corpo de e-mail viajando para `resend.dev` em modo teste | Information Disclosure | Nenhum e-mail da fase carrega nome de candidato (T-42-24) |
| Blob de Storage órfão e inapagável | Repudiation / Disclosure | Storage API + grep-guard contra `DELETE FROM storage.objects` |
| Exclusão parcial que declara conclusão | Repudiation | Estado por sistema no plano; a UI nunca diz "concluído" antes dos três (UI-SPEC Invariante 5) |
| Pseudonimização apresentada como anonimização | Repudiation (compliance) | Severar identificadores (Art. 12 §1º), não só apagar campos de exibição; teste de re-identificação como gate |
| Re-identificação por célula pequena no relatório de bias | Information Disclosure | k=5 **com supressão complementar** (§Pitfall 7) |

---

## Sources

### Primary (HIGH confidence) — código e artefatos deste repositório, lidos nesta sessão

- `docs/compliance/pii-inventory.yaml` — vocabulário de classificação (linhas 31-46) e classificação coluna-a-coluna (linhas 86-300)
- `supabase/functions/_shared/exportAllowlist.ts` — meta/totais e cobertura de 30/69 tabelas (parse programático)
- `docs/sql/sql/02-tabela-candidatos.sql:11-116` — DDL de `candidatos`, as 6 CHECKs, os 3 UNIQUE
- `database.types.ts` — nullability viva de `candidatos`, `historico_candidatura`, `decisao_final`, `decisao_final_historico`, `logs_acesso`, `autorizacoes`; ausência de `solicitacoes_dados`
- `supabase/migrations/20260804000002_p44_solicitacoes_dados.sql` — tabela, CHECKs, policy own-row, COMMENT que defere o `ON DELETE` a esta fase
- `supabase/migrations/20260625100001_decisao_final_phase15.sql:283-441` — `gerar_bias_snapshot()`
- `supabase/migrations/20260801000004_p43_previa_retencao.sql` — o molde de dry-run por expressão única + `REVOKE` nominal + guard NULL-safe
- `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` — `auto_rejeitado := (v_ator IS NULL)`
- `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql` — `trg_notif_transicao`
- `supabase/migrations/20260721000001_notificacoes_enviadas.sql` + `20260722000002_p37_notificacoes_lacunas.sql` — NOT NULLs, CASCADEs, `destinatario_original`
- `supabase/migrations/20260709000010_guard_rejeicao_auditada.sql` · `20260716000003_funil_kpis_v2_and_v_fila_trabalho.sql` · `20260801000002_p43_config_retencao.sql` · `20260804000001_p44_config_sla_dados.sql`
- `src/features/vagas/services/cvUploadService.ts` — convenção `{authUid}/{uuid}.pdf`; remoção explícita do CV antigo
- `src/features/privacidade/services/exportacaoService.ts` — ponte de tipos; `TTL_CURRICULO_SEGUNDOS`
- `src/features/pedidos-dados/constants/slaDados.ts` — por que 15 não é constante compilada
- `supabase/functions/get-curriculo-url/index.ts` · `exportar-meus-dados/index.ts` · `notificar-rh/helpers.ts`
- `.husky/pre-commit` — o gate de não-regressão
- `.planning/research/FK-AUDIT-LIVE.md` — **autoritativo** para `ON DELETE` (lê `pg_constraint`)
- `docs/compliance/anon-execute-definer-audit.md` · `docs/compliance/backup-posture.md`
- `.planning/STATE.md` · `.planning/REQUIREMENTS.md` · `.planning/research/PITFALLS.md` · `.planning/research/STACK.md`

### Secondary (MEDIUM confidence) — docs oficiais via Context7

- `supabase.com/docs/reference/javascript/auth-admin-createuser` — assinatura de `deleteUser(id, shouldSoftDelete)`, default `false`
- `supabase.com/docs/reference/javascript/auth-admin-listfactors` — soft delete "não reversível", identificação por hashed user ID
- `supabase.com/docs/guides/storage/management/delete-objects` — limite de **1000 objetos por `remove()`**
- `supabase.com/docs/guides/storage/production/scaling` · `supabase.com/docs/reference/*/admin-api` — paginação de `list()` (`limit`/`offset`)
- `supabase.com/docs/guides/storage/security/ownership` — `owner` **deprecada**, `owner_id` é o campo vivo

### Tertiary (LOW confidence) — WebSearch, marcado para validação

- `supabase.com/docs/guides/auth/managing-user-data` (via busca) — "cannot delete a user if they are the owner of any objects in Supabase Storage". **Tensiona com a depreciação de `owner`** → sonda (2) da §Environment Availability
- `nces.ed.gov/FCSM/pdf/2005FCSM_Dandekar_IXA.pdf` · `sdctools.github.io/HandbookSDC/07-glossary.html` · `census.gov/.../disclosure.html` — supressão primária × complementar

---

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH — zero dependência nova; cada ativo foi aberto e citado com caminho e linha.
- **Arquitetura (ordem, plano-primeiro, idempotência):** HIGH para o *porquê* da ordem (medido em `pg_constraint` via FK-AUDIT + nullability/CHECKs lidos) · MEDIUM para a *imposição de plataforma* do Storage (docs tensionam entre si — sonda registrada).
- **Pitfalls:** HIGH — 10 dos 12 vêm de arquivo lido nesta sessão com linha citada; o Pitfall 7 vem de literatura convergente de disclosure control; o Pitfall 12 é schema medido + escolha de projeto.
- **Recibo / derivação:** HIGH — a diferença de cobertura 30/69 foi calculada, não estimada.
- **k-anonymity:** HIGH para o mecanismo (supressão complementar é consenso da área) · a forma exata é discricionária dentro de D-45-04.
- **`shouldSoftDelete`:** LOW por natureza (comportamento não documentado) — **e neutralizado por desenho** via D-45-09.

**Research date:** 2026-08-04
**Valid until:** **2026-08-18** (14 dias). Curto de propósito: cinco afirmações desta pesquisa descrevem **estado vivo de PROD** (constraints de `candidatos`, FKs de `storage.objects`, `cron.job`, contagens de linhas, `NOTIFICACOES_MODO`) num banco com drift repo→PROD **documentado e de causa parcialmente desconhecida**. Passado esse prazo, re-rodar as cinco sondas da §Environment Availability antes de planejar sobre este documento.
