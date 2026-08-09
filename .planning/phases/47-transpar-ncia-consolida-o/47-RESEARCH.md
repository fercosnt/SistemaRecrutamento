# Phase 47: Transparência & Consolidação — Research

**Researched:** 2026-08-09
**Domain:** Compliance-as-code (LGPD Art. 18 VII / Art. 15-16), artefato derivado com portão,
resolução server-side de identidade, e um `DROP` sobre objeto com escritor vivo
**Confidence:** HIGH nas medições de código (tudo lido em disco nesta sessão) · LOW no único fato que
a fase declara bloqueante de embarque (o `país` dos subprocessadores — **não medível deste ambiente**)

---

## Summary

Esta fase tem seis requirements e **um único risco de perda irreversível**, mas o risco não está onde
o CONTEXT o localizou. O CONTEXT descreve o `data_deletion_log` como um zumbi com **um** escritor vivo
(a RPC de rollback da prompt-library). Medido: a tabela tem **um escritor e onze consumidores
derivados**, incluindo dois geradores de compliance, cinco artefatos gerados, dois YAML-fonte, o
catálogo vivo do M4, o `database.types.ts` e **uma string visível ao administrador** que nomeia a
tabela em um diálogo de confirmação. Um `DROP` que religue só o escritor deixa onze mentiras no
repositório — e duas delas em artefatos que se declaram autoridade.

O segundo achado inverte uma premissa de desenho. O CONTEXT e a UI-SPEC descrevem o
`check:recibo-exclusao` como "no pre-commit" e o usam como molde do `check:matriz-retencao`. Medido:
**o pre-commit roda apenas o gate de `tsc`**, e o CI roda **apenas** `check:export-allowlist`
(`ci.yml:88`). O `check:recibo-exclusao` existe em `package.json` e **não é invocado em lugar nenhum
— ele roda quando um humano lembra**. Copiar esse molde entregaria à Phase 47 um portão que não é
portão: exatamente a classe de promessa órfã que o CONSOL-04 existe para detectar, autorada pela
própria fase que a detecta.

O terceiro é o que quebra o CONSOL-02 em silêncio. `historico_candidatura.ator` referencia
**`auth.users(id)`**, não `usuarios_rh.id` — a migration que a cria diz isso em maiúsculas
(`20260607000001:18-19`) porque a tabela legada `historico_acoes` faz o contrário. O precedente que a
UI-SPEC manda clonar (`listar_matriz_retencao`) junta por `u.id = c.alterado_por`. Clonado verbatim,
**todas as linhas caem no rótulo "Recrutador removido"** e a fase entrega o oposto do requirement,
com a suíte verde. Somado a isso, a coluna a projetar (`usuarios_rh.nome_completo`) é `varchar(255)`
e já produziu, nesta mesma aplicação e nesta mesma coluna, o incidente de PROD `42804` que derrubou
`/admin/retencao` inteira (STATE.md:752).

**Recomendação primária:** planejar CONSOL-03 pela **saída de escape do CONTEXT — adotar a tabela**,
não dropá-la; tornar cada `check:` desta fase efetivamente invocado (CI, não só `package.json`) e
**consertar o `check:recibo-exclusao` órfão no mesmo movimento**; e escrever a RPC do histórico com
`u.user_id = h.ator`, `::text` explícito, guard `IS DISTINCT FROM` e re-imposição do escopo por vaga.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1 — As duas páginas públicas (TRANSP-01, TRANSP-02)**

- **Duas rotas separadas, não uma página com seções.** `/privacidade` responde *o que é guardado, por
  quanto tempo e por quê*; `/subprocessadores` responde *com quem os dados são compartilhados*
  (Art. 18, VII).
- **A tabela de retenção é DERIVADA por gerador em build-time**, num `.generated.ts`, espelhando
  exatamente o padrão já provado pelo 45-02 (`docs/compliance/sql/gen-recibo-exclusao.cjs` + o script
  `check:recibo-exclusao` no pre-commit). Um teste reprova quando a matriz muda sem regenerar.
  **Rejeitado:** ler `listar_matriz_retencao` em runtime — exigiria expor a RPC a `anon`.
- **Cada subprocessador declara nome + finalidade + país + base legal.**
- **100% público: sem auth, indexável.**

**Área 2 — O nome do recrutador no Histórico (CONSOL-01 / VISRH-03)**

- **O nome é resolvido no servidor**, na RPC/view que já serve o histórico. Evita N+1 e evita expor a
  tabela de usuários RH.
- **Ator que é trigger automático renderiza o rótulo neutro "Sistema"** — nunca UUID, nunca vazio.
- **`ator` NULL renderiza "Recrutador removido"**, sem quebrar a tela. *(Substituído pela Área 5.)*
- **Nome completo, não primeiro nome.**

**Área 3 — O zumbi `data_deletion_log` (CONSOL-03)**

- **DROP, mas só depois de religar o escritor vivo.**
- **O destino do escritor é MEDIDO no plano, não fixado agora.**
- **Ordem obrigatória, em planos separados:** religar o escritor + provar por smoke → **só então** o
  `DROP`.
- **Saída de escape declarada:** se religar o escritor não for trivial, **adotar** a tabela (mantê-la
  com escritas reais e o `COMMENT` corrigido) em vez de dropar.

**Área 4 — Vereditos Nyquist do M7 (SC#4) e o checklist de promessas (CONSOL-02)**

- **"Veredito real" significa auditar os artefatos existentes** de cada fase. **Não** significa
  re-executar as seis fases do M7.
- **Um plano só, produzindo os 6 arquivos**, via `gsd-nyquist-auditor`. Fases 36, 37, 38, 39, 40, 41.
- **Veredito negativo é aceitável e é o ponto.**
- **O checklist do CONSOL-02 é um TESTE VERSIONADO**, não um documento — molde
  `src/__tests__/copyPortoesLgpd.test.ts`.

**Área 5 — Correções factuais e decisões pós-UI-SPEC (operador, 2026-08-09) — travadas, substituem
Área 1 e 2 onde houver conflito**

- **O Histórico é superfície de RH, não de candidato.**
- **`ator IS NULL` JÁ significa "Sistema" hoje.** Valem os **quatro** rótulos da `D-47-U08`, com
  "Recrutador removido" derivado da **falha de resolução do nome**, nunca de `ator IS NULL`. O
  resíduo da severação da Phase 45 (`D-47-U09`) é **aceito e escrito**.
- **A lista pública tem SEIS entradas, não quatro** (`D-47-U06`): Anthropic, **OpenAI**, **ViaCEP**,
  Resend, Supabase, Vercel. **O campo `país` é BLOQUEANTE de embarque**: é medido no plano, e a
  entrada **não embarca** se o país não for medível.
- **`/manifesto` é precedente de ROTA, não de alcançabilidade** — daí o `RodapePublico` ser entrega
  da fase.
- **Revisão do Encarregado — gate de PUBLICAÇÃO, não de engenharia.** A fase **constrói normalmente**;
  o plano registra um item explícito de revisão do Encarregado **antes de as rotas ficarem
  alcançáveis em produção**. Não bloqueia escrever código; bloqueia publicar.

### Claude's Discretion

- A copy exata das duas páginas públicas, dentro do registro pt-BR já estabelecido e da linguagem de
  produto obrigatória ("avaliação comportamental/cognitiva", nunca "teste psicológico").
- A estrutura de arquivos dentro de `src/features/`, seguindo a convenção do projeto.
- O ponto de navegação exato das duas páginas.
- A forma concreta do gerador da matriz de retenção, desde que espelhe o contrato do 45-02: falha
  ALTO quando fonte e artefato divergem.

### Deferred Ideas (OUT OF SCOPE)

- **`DI-45-05-01`** — a tela de auditoria de viés lê o payload v1 e renderiza `undefined` nas células
  suprimidas por k-anonimato.
- **`DI-45-08-01`** — o "X" do `DialogContent` vendorizado tem rótulo `sr-only` em inglês e não atinge
  44px.
- **`DI-45-12-01`** — a asserção C1 do smoke da Phase 45 e a migration `20260805000003` afirmam coisas
  opostas sobre `EXECUTE` em `gerar_bias_snapshot`.
- Qualquer coisa que dependa da **Phase 46** (a purga automática).

---

## Phase Requirements

A numeração canônica é a do `REQUIREMENTS.md` — o CONTEXT está deslocado, e a `D-47-U13` já travou a
correção. Lida verbatim de `.planning/REQUIREMENTS.md:132-140`
[VERIFIED: .planning/REQUIREMENTS.md:132-140]:

| ID | Descrição (verbatim do REQUIREMENTS.md) | Research Support |
|----|------------------------------------------|------------------|
| **TRANSP-01** | "Página informando com quem os dados são compartilhados (**Art. 18, VII**) — Resend, provedor de LLM, Supabase, Vercel" | §Subprocessadores — as 6 entradas medidas e o bloqueio de `país` (§C3) |
| **TRANSP-02** | "Página 'o que guardamos e por quê', derivada da matriz de retenção como dado" | §A matriz como dado (§C2) — fonte, forma do gerador, e o buraco de origem |
| **CONSOL-01** | "Cobertura Nyquist das 6 fases sem veredito — 36/38/39/41 em `draft`, 37/40 sem arquivo" | §C6 — inventário medido dos artefatos, e o caminho correto dos diretórios |
| **CONSOL-02** | "W-1 — Histórico (VISRH-03) mostra o nome do recrutador em vez do UUID do `ator`" | §C4 — a chave de junção, o `::text`, o escopo por vaga e o guard de papel |
| **CONSOL-03** | "Zumbi `data_deletion_log` removido ou adotado com escritas reais" | §C1 — o raio de alcance completo (12 artefatos) e a recomendação |
| **CONSOL-04** | "Checklist 'zumbi de compliance' — toda promessa de retenção/exclusão em comentário de migration ou doc tem código que a executa" | §C5 — o molde, a superfície realista, e o primeiro achado que ele já produz |

**⚠ Requirement fora da lista da fase, mas endereçado a ela pelo `REQUIREMENTS.md`:** ver §Open
Question 1 (CONSENT-05).

---

## Project Constraints (from CLAUDE.md)

Diretivas acionáveis extraídas de `./CLAUDE.md`. O planner deve verificar conformidade explícita com
cada uma — elas têm a mesma autoridade que as decisões travadas do CONTEXT.

| # | Diretiva | Onde morde nesta fase |
|---|----------|----------------------|
| 1 | **NUNCA usar `supabaseAdmin` / service_role key no client-side** | A RPC do CONSOL-02 é o caminho; nenhuma leitura de `usuarios_rh` do cliente |
| 2 | **Operações privilegiadas vão para Edge Functions** | Nada nesta fase precisa de EF — mas o gerador **não fala com o banco** (molde 45-02) |
| 3 | **RLS habilitado em 100% das tabelas com dados de usuário** | Um `DROP` de `data_deletion_log` remove também a policy `administrador_le_data_deletion_log` |
| 4 | **DevNavigationMenu gateado por `import.meta.env.DEV`** | É exatamente por isso que `/manifesto` não é precedente de alcançabilidade |
| 5 | **Linguagem de produto: "avaliação comportamental/cognitiva", nunca "teste psicológico"** | Copy das duas páginas públicas; já gateado por `copyPortoesLgpd.test.ts` |
| 6 | **Sistema NUNCA rejeita candidato automaticamente por score (RNF-07a)** | Nenhuma copy das páginas pode implicar decisão automática |
| 7 | **`database.types.ts` gerado pelo CLI — NUNCA editar à mão** | Um `DROP` invalida o arquivo; a regeneração é bloqueada hoje (ver §Environment) |
| 8 | **Migrations PL/pgSQL: sem `BEGIN;/COMMIT;` externo + `migration repair` no cabeçalho** | Toda migration desta fase (a RPC do histórico, e o `DROP`/`ADOPT` do CONSOL-03) |
| 9 | **Enums DB em snake_case pt-BR; domínio pt-BR, código técnico en** | Rótulos e enums de auditoria |
| 10 | **Componentes PascalCase.tsx, export nomeado (nunca default); features em `src/features/<dominio>/`** | `src/features/transparencia/` |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Matriz de retenção como dado | Database (`config_retencao_etapa`) | — | A fonte de verdade é a tabela; o CHECK `1..24` e o seed de 8 estados vivem lá |
| Derivação da matriz para a página pública | **Build-time (script Node)** | Repo (artefato `.generated.ts`) | Decisão travada: nada em runtime. Molde 45-02 — o gerador **não fala com o banco** |
| Renderização das 2 páginas públicas | Browser / Client (SPA estática) | — | Import estático de constante; zero rede, zero estado assíncrono (Invariante 6) |
| Alcançabilidade das 2 páginas (`RodapePublico`) | Browser / Client | — | Componente de navegação montado em 3 rotas públicas existentes |
| Resolução do nome do recrutador | **Database (RPC `SECURITY DEFINER`)** | API (PostgREST) | `usuarios_rh` é admin-only desde a SEG-02; o cliente nunca a consulta |
| Escopo por vaga do histórico | **Database (RLS hoje; corpo da RPC amanhã)** | — | ⚠ DEFINER **bypassa RLS** — a mudança de tier move o controle de acesso (ver §C4.3) |
| Trilha de auditoria do rollback da prompt-library | Database (`logs_auditoria` via `log_auditoria()`) | — | Sink canônico do projeto, DEFINER + BYPASSRLS, idioma provado em 2 fases |
| Checklist de promessas (CONSOL-04) | **Build-time (Vitest, `node:fs`)** | Repo (migrations + docs) | Molde `copyPortoesLgpd.test.ts` — varredura de arquivo, sem banco |
| Vereditos Nyquist (CONSOL-01) | Repo (`.planning/milestones/v7.0-phases/`) | — | Auditoria documental; nenhum código de produto muda |

---

## C1 · CONSOL-03 — o raio de alcance real do `data_deletion_log`

**Este é o achado que mais muda o plano.** O CONTEXT descreve um escritor. Medidos: **1 escritor,
11 consumidores derivados**, distribuídos por três geradores, cinco artefatos gerados, dois YAML-fonte
e uma string visível.

### C1.1 · O objeto, verbatim

Definido em `supabase/migrations/20260609000001_prompt_library_schema.sql:315-334`
[VERIFIED: supabase/migrations/20260609000001_prompt_library_schema.sql:315-334]:

```sql
CREATE TABLE public.data_deletion_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_type text NOT NULL,            -- e.g. 'prompt_rollback:cv_job_match:1.0.0' | 'candidate_full_deletion'
  deleted_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_deletion_log_deleted_at ON public.data_deletion_log (deleted_at DESC);

ALTER TABLE public.data_deletion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY administrador_le_data_deletion_log ON public.data_deletion_log
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  );

COMMENT ON TABLE public.data_deletion_log IS
  'Phase 9 / LGPD audit: append-only deletion/rollback audit trail (no candidate ID — compliance). '
  'The rollback_to_version RPC writes a prompt_rollback row here. The Art.18 candidate-deletion '
  'function (delete_candidate_data) is deferred to Phase 15.';
```

O `COMMENT` promete `delete_candidate_data` — a função que a Phase 15 nunca criou. **Esta é a
promessa órfã canônica do repositório**, e é o achado-semente do CONSOL-04.

### C1.2 · O escritor vivo — o que ele grava, exatamente

`supabase/migrations/20260609000002_prompt_library_rpcs.sql:226-228`
[VERIFIED: supabase/migrations/20260609000002_prompt_library_rpcs.sql:226-228]:

```sql
  -- Audit trail (no candidate ID — compliance).
  INSERT INTO public.data_deletion_log (deletion_type, deleted_at)
  VALUES ('prompt_rollback:' || p_call_type::text || ':' || p_semver, now());
```

Três fatos que decidem a relocação:
1. Grava **uma string composta** e um timestamp. Não há `usuario_id`, não há `recurso_id`, não há
   `dados_antes`/`dados_depois`. É o payload mais pobre possível.
2. É o **último statement antes do `RETURN`**, dentro de uma função já `SECURITY DEFINER
   SET search_path = ''` com guard de papel `administrador`.
3. **Nada lê essa linha.** Nenhum `SELECT ... FROM data_deletion_log` existe em `src/`,
   `supabase/functions/` ou em qualquer migration. A única leitura possível é a policy
   `administrador_le_data_deletion_log`, e nenhuma tela a exerce.
   [VERIFIED: varredura repo-wide de `data_deletion_log`, 0 ocorrências de SELECT]

### C1.3 · Os 11 consumidores derivados — o inventário fechado

| # | Consumidor | Papel | O que quebra / mente com o `DROP` |
|---|-----------|-------|-----------------------------------|
| 1 | `docs/compliance/pii-inventory.yaml:443-449` | **FONTE** dos dois geradores | Bloco `data_deletion_log:` com `natureza:` + 1 coluna classificada |
| 2 | `docs/compliance/export-scope-rules.yaml:266` | **FONTE** do gerador de export | `data_deletion_log: telemetria_interna` |
| 3 | `docs/compliance/catalogo-vivo-44.json` (1 tabela + 4 colunas) | **FONTE** — snapshot do `information_schema` vivo | Catálogo passa a divergir do banco; `meta.totais.tabelas_base_public: 69` fica errado |
| 4 | `docs/compliance/sql/gen-recibo-exclusao.cjs:217` | **GERADOR** — `FORA_DO_ESCOPO_DO_TITULAR` | Entrada apontando para tabela inexistente |
| 5 | `docs/compliance/export-allowlist.json:16` | artefato gerado | ⚠ Gated por CI (`ci.yml:88`) — reprova o build |
| 6 | `supabase/functions/_shared/exportAllowlist.ts:34` | artefato gerado (EF) | ⚠ Gated por CI |
| 7 | `docs/compliance/recibo-exclusao.json:479` | artefato gerado | **Não gated** (ver §C2.3) |
| 8 | `supabase/functions/_shared/reciboExclusao.ts:513` | artefato gerado (EF) | **Não gated** |
| 9 | `src/features/privacidade/constants/reciboExclusao.generated.ts:513` | artefato gerado (frontend) | **Não gated** — e é a fonte do **Bloco 2 de `/privacidade`** desta fase |
| 10 | `database.types.ts:1496` | tipos gerados pelo CLI | Regeneração hoje **bloqueada** (§Environment) |
| 11 | `src/features/admin/prompt-versions/components/PromptVersionsPage.tsx:159` | **STRING VISÍVEL AO ADMINISTRADOR** | Diálogo diz "registrada na trilha de auditoria (data_deletion_log)" — vira falso |

Referências não-bloqueantes adicionais (documentação histórica, não artefato vivo):
`docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md` (5 ocorrências),
`docs/conhecimento/prompts/RUNBOOK.md:255,283`,
`docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md:691`,
`docs/compliance/achados-inventario.md:133` (achado A-05),
`docs/compliance/pii-inventory.md:547,617` (achado A-06),
`supabase/migrations/20260706110007_sec10_drop_backup.sql:7`.

### C1.4 · O destino da relocação — medido e disponível

`public.log_auditoria(...)` é o sink canônico. Assinatura verbatim registrada em
`supabase/migrations/20260713000003_usr_rh_mutacao_rpc.sql:38-39`
[VERIFIED: supabase/migrations/20260713000003_usr_rh_mutacao_rpc.sql:37-39]:

```
--   log_auditoria(p_usuario_id uuid, p_usuario_tipo text, p_acao text,
--     p_categoria categoria_log_auditoria, p_descricao text, p_severidade severidade_log,
```

Idioma provado duas vezes (`usr_rh_mutacao_rpc` na Phase 13, `salvar_janela_retencao` na Phase 43):
`PERFORM public.log_auditoria(...)` dentro do MESMO corpo → mesma transação. E a razão pela qual ele
funciona sob o REVOKE da P28, verbatim de
`supabase/migrations/20260801000002_p43_config_retencao.sql:419-421`
[VERIFIED: supabase/migrations/20260801000002_p43_config_retencao.sql:418-423]:

```
  -- auditoria" — sem ele a copy seria mais uma promessa órfã. `log_auditoria` é
  -- SECURITY DEFINER com owner BYPASSRLS, então a linha sobrevive ao REVOKE de
  -- INSERT que a P28 aplicou sobre logs_auditoria.
```

**Os dois enums vivos, verbatim de `database.types.ts:5527-5537` e `:5580`**
[VERIFIED: database.types.ts:5527-5537, 5580]:

```
      categoria_log_auditoria:
        | "autenticacao"
        | "candidatura"
        | "vaga"
        | "usuario"
        | "configuracao"
        | "teste"
        | "entrevista"
        | "avaliacao"
        | "sistema"
        | "seguranca"
```
```
      severidade_log: "info" | "aviso" | "erro" | "critico"
```

Um rollback de prompt-library é `categoria = 'configuracao'` ou `'sistema'` — **os dois existem**,
nenhum valor novo é necessário, e nenhum `ALTER TYPE` entra na fase. O par `('configuracao','aviso')`
já foi medido contra os enums vivos pela Phase 43 e é o precedente mais próximo.

### C1.5 · A recomendação, e por que ela é a saída de escape

O CONTEXT declara: *"se religar o escritor não for trivial, **adotar** a tabela … em vez de dropar"*.
**Religar o escritor é trivial** (uma migration `CREATE OR REPLACE FUNCTION` trocando um `INSERT` por
um `PERFORM`). **Dropar a tabela não é** — são 11 consumidores, três geradores, cinco artefatos
regerados, um `database.types.ts` que hoje **não pode ser regenerado** e uma string de produto.

**Recomendação: ADOTAR.** Justificativa em quatro pontos, todos medidos:

1. **O critério de sucesso aceita as duas saídas** — "removido **OU** adotado com escritas reais".
   A tabela **já tem** escrita real: a RPC de rollback grava nela hoje. Adotar exige **corrigir o
   `COMMENT`** (remover a promessa de `delete_candidate_data`) e nada mais.
2. **O `DROP` não reduz risco de compliance; aumenta.** A tabela não contém PII (4 colunas, nenhuma
   FK, nenhum `candidato_id` — o próprio inventário diz `tabela_sem_vinculo_com_titular`). O que
   torna a tabela um problema não é a existência dela, é o **`COMMENT` que promete uma função
   ausente**. Corrigir o `COMMENT` fecha o achado A-05/A-06 sem tocar em nada mais.
3. **O `DROP` empurra a fase para dentro de um bloqueio de ambiente.** `database.types.ts` não pode
   ser regenerado hoje (sem `SUPABASE_ACCESS_TOKEN`, sem CLI no PATH — §Environment). Um `DROP`
   deixaria o arquivo de tipos afirmando uma tabela morta, com a regeneração como dependência humana.
4. **A adoção é reversível; o `DROP` não.** É a leitura direta do critério registrado na memória do
   operador: *escrita aditiva é autônoma, destrutiva é gated*. Adotar mantém a fase inteiramente
   aditiva e **elimina o portão destrutivo do M8** desta fase.

**Se o operador ainda assim escolher `DROP`**, a ordem obrigatória tem **sete** passos, não dois:

1. Religar o escritor (`CREATE OR REPLACE FUNCTION public.rollback_to_version` → `PERFORM
   public.log_auditoria(...)`) + smoke provando que o rollback grava em `logs_auditoria`.
2. Corrigir a string visível `PromptVersionsPage.tsx:159`.
3. Remover as 3 entradas de fonte (`pii-inventory.yaml`, `export-scope-rules.yaml`,
   `catalogo-vivo-44.json` — incluindo `meta.totais`) e a entrada do gerador
   (`gen-recibo-exclusao.cjs:217`).
4. Regerar os 5 artefatos e provar `check:export-allowlist` **e** `check:recibo-exclusao` verdes.
5. **Só então** o `DROP TABLE` (que leva junto o índice e a policy).
6. Regenerar `database.types.ts` — **checkpoint humano** (§Environment).
7. `VERIFICATION.md` com veredito + code review bloqueante + asserções negativas + zero `--no-verify`
   (portão destrutivo do M8, STATE.md:550).

---

## C2 · TRANSP-02 — a matriz derivada, e os dois buracos do molde

### C2.1 · A fonte, medida

`supabase/migrations/20260801000002_p43_config_retencao.sql`
[VERIFIED: supabase/migrations/20260801000002_p43_config_retencao.sql, bloco DDL + seed]:

```sql
CREATE TABLE public.config_retencao_etapa (
  etapa         public.etapa_processo NOT NULL PRIMARY KEY,
  janela_meses  integer     NOT NULL CHECK (janela_meses BETWEEN 1 AND 24),
  origem        text        NOT NULL DEFAULT 'seed' CHECK (origem IN ('seed', 'admin')),
  alterado_por  uuid        NULL REFERENCES public.usuarios_rh(id),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
```

Seed verbatim — **os 8 estados, todos `24`**:

```sql
INSERT INTO public.config_retencao_etapa (etapa, janela_meses, origem)
VALUES
  ('inscricao',             24, 'seed'),
  ('triagem',               24, 'seed'),
  ('avaliacao_assincrona',  24, 'seed'),
  ('entrevista_online',     24, 'seed'),
  ('entrevista_presencial', 24, 'seed'),
  ('decisao_final',         24, 'seed'),
  ('aprovado',              24, 'seed'),
  ('rejeitado',             24, 'seed')
ON CONFLICT (etapa) DO NOTHING;
```

Os rótulos pt-BR, verbatim de `src/features/triagem/services/triagemService.ts:386-395`
[VERIFIED: src/features/triagem/services/triagemService.ts:386-395]:

```ts
export const ETAPA_M2_LABELS: Record<EtapaFunilM2, string> = {
  inscricao: 'Inscrição',
  triagem: 'Triagem',
  avaliacao_assincrona: 'Avaliação Assíncrona',
  entrevista_online: 'Entrevista Online',
  entrevista_presencial: 'Entrevista Presencial',
  decisao_final: 'Decisão Final',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}
```

E a ordem de funil, verbatim de `:398-409` [VERIFIED: src/features/triagem/services/triagemService.ts:398-409]:

```ts
export const ETAPA_M2_OPTIONS: { value: EtapaFunilM2; label: string }[] = (
  [
    'inscricao',
    'triagem',
    'avaliacao_assincrona',
    'entrevista_online',
    'entrevista_presencial',
    'decisao_final',
    'aprovado',
    'rejeitado',
  ] as EtapaFunilM2[]
).map((value) => ({ value, label: ETAPA_M2_LABELS[value] }))
```

### C2.2 · ⚠ BURACO 1 — o gerador não tem fonte de dado no repositório

O molde `gen-recibo-exclusao.cjs` lê **um YAML versionado** (`pii-inventory.yaml`) e declara em
docblock: *"ESTE SCRIPT NÃO FALA COM O BANCO. Não abre conexão, não lê credencial, não usa MCP."*
[VERIFIED: docs/compliance/sql/gen-recibo-exclusao.cjs:54-56].

A matriz de retenção **não tem equivalente**. O único artefato do repositório que carrega
`janela_meses` como dado é o bloco `VALUES` da migration de seed — e ele é `ON CONFLICT DO NOTHING`,
logo **não reflete nenhuma edição de administrador**. Consequências que o planner tem de decidir:

- O gerador precisa de **uma fonte declarada e versionada**. As duas formas honestas:
  **(a)** um `docs/compliance/matriz-retencao.yaml` novo, autorado, *datado*, carregando as 8 janelas
  + a finalidade por etapa; ou **(b)** parsear o bloco `VALUES` da migration de seed.
- **A opção (b) é a armadilha.** Ela parece "derivada da fonte" e não é: o seed é o estado
  **inicial**, não o estado **vigente**. Se um administrador já mudou uma janela em PROD, a página
  publicaria `24` afirmando que é o que o sistema usa.
- ⚠ **A copy do Bloco 5 da UI-SPEC já é uma promessa sob essa hipótese.** Ela diz, verbatim:
  *"são gerados a partir da mesma configuração que o sistema usa para decidir por quanto tempo
  guardar cada candidatura"*. Com fonte de repositório, essa frase só é verdadeira **enquanto
  ninguém editar em produção** — o que é precisamente o cenário da Invariante 2. Recomendação: o
  plano registra a data de **medição** da matriz viva (checkpoint do orquestrador via MCP) e o
  gerador carimba essa data no artefato; o "Política vigente em {data}" passa a ser a data medida,
  não a data do build.

### C2.3 · ⚠ BURACO 2 — o `check:` do molde não é invocado por nada

Medido nesta sessão. O pre-commit roda **apenas** o gate de `tsc`
[VERIFIED: .husky/pre-commit — arquivo inteiro lido, único comando executável]:

```sh
COUNT=$(npm run -s lint 2>&1 | grep -c "error TS" || true)
echo "tsc errors: $COUNT (frozen baseline: 97)"
if [ "$COUNT" -gt 97 ]; then
```

`.husky/` contém **um único arquivo executável** (`pre-commit`); não há `lint-staged`
(`package.json` não define a chave) [VERIFIED: ls .husky/ + node -e leitura de package.json].

E no CI, apenas um dos três `check:` é invocado
[VERIFIED: .github/workflows/ci.yml:88 — única ocorrência de `check:` em todo o workflow]:

```yaml
      - run: npm run check:export-allowlist
```

| Script | Definido em `package.json` | Invocado no pre-commit | Invocado no CI | Estado real |
|---|---|---|---|---|
| `check:export-allowlist` | ✓ (`:103`) | ✗ | ✓ (`ci.yml:88`) | **É um portão** |
| `check:recibo-exclusao` | ✓ (`:104`) | ✗ | ✗ | **ÓRFÃO** — roda quando um humano lembra |
| `check:resend-dominio` | ✓ (`:102`) | ✗ | ✗ | **ÓRFÃO** |

O CONTEXT (§Área 1 e §Reusable Assets) e a UI-SPEC (Invariante 1, §Gerador e portões) descrevem o
`check:recibo-exclusao` como estando "no pre-commit". **É factualmente falso.** Um plano que clone o
molde literalmente adiciona `check:matriz-retencao` a `package.json` e para — produzindo um terceiro
portão órfão, **na fase cujo requirement CONSOL-04 existe para achar exatamente isso**.

**Recomendação prescritiva:** o `check:matriz-retencao` entra no **job `unit` do `ci.yml`**, ao lado
do `check:export-allowlist` (o precedente vivo do WR-08, cujo comentário no CI já registra que "quatro
docblocks tratavam este comando como autoridade e ele não era invocado em lugar nenhum" — a mesma
lição, mesma fase-irmã). E o plano **conserta o `check:recibo-exclusao` no mesmo commit**: ele é a
fonte do Bloco 2 desta página, e publicar uma declaração pública derivada de um artefato sem portão é
o defeito que a fase existe para remover.

Ambos os `check:` estão **verdes hoje** [VERIFIED: execução nesta sessão]:

```
OK: docs/compliance/export-allowlist.json e supabase/functions/_shared/exportAllowlist.ts estão em sincronia com as três fontes.
OK: docs/compliance/recibo-exclusao.json, supabase/functions/_shared/reciboExclusao.ts e src/features/privacidade/constants/reciboExclusao.generated.ts estão em sincronia com docs/compliance/pii-inventory.yaml.
```

### C2.4 · A forma do `--check` — o molde a copiar verbatim

`docs/compliance/sql/gen-recibo-exclusao.cjs:1090-1119`
[VERIFIED: docs/compliance/sql/gen-recibo-exclusao.cjs:1088-1119]. As três propriedades load-bearing:

```js
if (args.includes('--check')) {
  ...
  const doc = construir();
  // Pina o carimbo de execução do disco: sem isso o `--check` divergiria pelo
  // relógio e nunca poderia sair 0 — um gate que nunca passa não é um gate.
  doc.meta.gerado_em = discoJson.meta && discoJson.meta.gerado_em;
```

1. **O carimbo de tempo é pinado do disco no modo `--check`.** Sem isso o gate diverge pelo relógio e
   nunca sai 0. Um gerador novo que carimbe `gerado_em` **tem** de repetir esse pin.
2. **Cada artefato é conferido SEPARADAMENTE** — o loop confere o `.json` e depois cada espelho `.ts`
   contra a serialização esperada. O docblock diz por quê: *"um `--check` que olhasse só um deixaria
   os outros apodrecer"*.
3. **Ausência conta como divergência**, não como erro de leitura:
   `const disco = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';`

Dependências do molde: apenas `fs`, `path` e `js-yaml` — **já presentes**. Zero npm novo.
⚠ **`yaml.safeLoad`, NUNCA `yaml.load`** — o docblock registra a razão (js-yaml 3.x usa schema full
no `load`; script de compliance carregando YAML com schema full é achado de auditoria)
[VERIFIED: docs/compliance/sql/gen-recibo-exclusao.cjs:86-91].

---

## C3 · TRANSP-01 — os subprocessadores e o `país` bloqueante

### C3.1 · As seis entradas — o que está medido no repositório

| Empresa | Evidência medida nesta sessão | Confiança |
|---|---|---|
| **Supabase** | `supabase/config.toml:19` → `project_id = "isljnozzlvckrgjjbjwp"`; `.env.local:2` → `https://isljnozzlvckrgjjbjwp.supabase.co` | HIGH |
| **Vercel** | `vercel.json` presente (`outputDirectory: "build"`, rewrites SPA) | HIGH |
| **Resend** | `supabase/functions/_shared/email-config.ts:124,170,181` — sink `*@resend.dev` em modo teste | HIGH |
| **Anthropic** | `_shared/ai-client.ts:43-44` (`npm:@anthropic-ai/sdk@0.102.0`), `:516` (`anthropic.messages.parse`), `:552,568` (`provider: "anthropic"`) | HIGH |
| **OpenAI** | `_shared/ai-client.ts:45-46` (`npm:openai@6.42.0`), `:61` (`const OPENAI_FALLBACK_MODEL = "gpt-4o-mini"`), `:26-27` (fallback com `provider='openai'`) | HIGH |
| **ViaCEP** | `src/features/cadastro/services/viaCepService.ts:19` → `const VIACEP_BASE_URL = 'https://viacep.com.br/ws'` | HIGH |

A `D-47-U06` está **confirmada por medição**: OpenAI é caminho de fallback vivo (não código morto) e
ViaCEP é chamada do navegador do candidato. Seis é o número correto.

### C3.2 · ⚠ O `país` NÃO é medível deste ambiente — e a lista de bloqueio é maior que uma entrada

O `país` de um subprocessador não é o país da sede da empresa; é **a região onde o dado deste projeto
é tratado**. São fatos diferentes, e só o segundo é o que a LGPD faz importar numa declaração de
transferência internacional. Medido: **nenhuma das seis regiões está no repositório.**

Tentativas de medição executadas nesta sessão [VERIFIED: execução em bash]:

| Caminho | Resultado |
|---|---|
| `SUPABASE_ACCESS_TOKEN` no ambiente | **ausente** |
| Supabase CLI no PATH | **ausente** (`command -v supabase` → vazio) |
| `dig db.isljnozzlvckrgjjbjwp.supabase.co` | **não resolve** |
| `dig isljnozzlvckrgjjbjwp.supabase.co` | `104.18.38.10`, `172.64.149.246` — **Cloudflare**, não revela a região de origem |
| `vercel.json` → chave `regions` | **ausente** (o arquivo tem só `$schema`, `outputDirectory`, `rewrites`) |
| Pin de região para Resend / Anthropic / OpenAI no repositório | **nenhum** |

E `docs/compliance/backup-posture.md:84` já registra, verbatim
[VERIFIED: docs/compliance/backup-posture.md:80-84]:

```
| `region` | — |
```

O caminho de medição que o próprio documento prescreve, verbatim de `:88-92`:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.supabase.com/v1/projects/isljnozzlvckrgjjbjwp/database/backups
```

**Consequência de planejamento, e ela é estrutural:** a Invariante 5 da UI-SPEC diz que a entrada sem
país **não embarca**. Aplicada ao estado medido hoje, **nenhuma das seis entradas embarca** — e uma
página `/subprocessadores` com zero fichas é falha de geração (regra "fail high"), não uma página.
**A medição do `país` é pré-requisito de wave, não uma tarefa dentro da wave da página.**

Caminhos de medição por entrada — o plano deve tratar cada um como checkpoint do orquestrador:

| Empresa | Como medir o país/região | Medível por subagente? |
|---|---|---|
| Supabase | Management API `GET /v1/projects` → campo `region` (exige `SUPABASE_ACCESS_TOKEN`), ou dashboard | ✗ — checkpoint humano |
| Vercel | Dashboard do projeto / `vercel project inspect`. ⚠ Para um SPA estático a "região" é a rede de borda global — a declaração honesta pode ser sobre a **empresa e a rede**, não uma região única. **Decisão a registrar.** | ✗ — checkpoint humano |
| Resend | Configuração de região da conta (Resend oferece região dedicada); default é EUA | ✗ — checkpoint humano |
| Anthropic | Endpoint `api.anthropic.com` sem seleção de região no `ai-client.ts` → tratamento fora do Brasil | Parcial — o repo prova ausência de pin |
| OpenAI | Endpoint `api.openai.com` sem seleção de região no `ai-client.ts` → idem | Parcial — o repo prova ausência de pin |
| ViaCEP | `viacep.com.br` — serviço público brasileiro | Parcial — verificar em doc oficial |

⚠ **Nenhum país acima está afirmado por esta pesquisa.** As colunas descrevem *como medir*, não *qual
é*. Um plano que leia esta tabela como resposta reintroduz o defeito que a Invariante 5 proíbe.
[ASSUMED — todas as inferências de país nesta tabela]

### C3.3 · O campo "O que recebe" (D-47-U05) — o limite factual do mascaramento

`maskPII` remove **sete classes de padrão, por regex**, verbatim de
`supabase/functions/_shared/pii-masker.ts:38-54` [VERIFIED: supabase/functions/_shared/pii-masker.ts:38-54]:

```ts
  { placeholder: "[CNPJ]", regex: /\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b/g },
  { placeholder: "[CPF]", regex: /\b\d{3}\.?\d{3}\.?\d{3}-\d{2}\b/g },
  { placeholder: "[EMAIL]", regex: /\b[\w._%+-]+@[\w.-]+\.[a-z]{2,}\b/gi },
  { placeholder: "[DATA_NASC]", regex: /\b\d{2}\/\d{2}\/(?:19|20)\d{2}\b/g },
  { placeholder: "[TELEFONE]", regex: /\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g },
    regex: /\b(?:Rua|Av\.?|Avenida|Alameda|Travessa|Pra[cç]a|Rod\.?|Rodovia)\s+[\wÀ-ÿ\s]+,\s*\d+/gi,
  { placeholder: "[RG]", regex: /\b\d{2}\.?\d{3}\.?\d{3}-[\dxX]\b/g },
```

**Não há padrão de NOME.** A copy das entradas de IA pode dizer que CPF, CNPJ, e-mail, telefone, RG,
data de nascimento e endereço com logradouro são removidos — e **nada além disso**. Um nome próprio
digitado dentro de texto livre chega ao provedor. A UI-SPEC já proíbe "de forma anônima" / "sem
identificação" / "anonimizado"; esta é a medição que torna a proibição verificável.

---

## C4 · CONSOL-02 — o nome do recrutador, e os quatro modos de falha

### C4.1 · ⚠ A chave de junção não é a do precedente

`historico_candidatura.ator`, verbatim de
`supabase/migrations/20260607000001_historico_candidatura.sql:43`
[VERIFIED: supabase/migrations/20260607000001_historico_candidatura.sql:43]:

```sql
  ator uuid REFERENCES auth.users(id),             -- NULL-able (D-09): auth.uid() for humans, NULL for system/service_role
```

E a migration alerta explicitamente contra a confusão, verbatim de `:16-19`
[VERIFIED: supabase/migrations/20260607000001_historico_candidatura.sql:14-19]:

```
-- COEXISTENCE WITH LEGACY historico_acoes (Pitfall 5 — do NOT conflate):
-- A legacy `public.historico_acoes` table already exists (Figma-Make era) with
-- (candidatura_id, tipo_acao enum, usuario_id FK usuarios_rh.id, descricao, metadata). This
-- new table is DELIBERATELY different and is NOT a reuse of it: it carries explicit
-- etapa_de/etapa_para enum columns, auto_rejeitado boolean, and `ator` FK to **auth.users**
-- (NOT usuarios_rh). Leave historico_acoes untouched (out of scope).
```

O precedente que a UI-SPEC manda clonar junta pelo **outro** lado, verbatim de
`supabase/migrations/20260801000002_p43_config_retencao.sql`
[VERIFIED: supabase/migrations/20260801000002_p43_config_retencao.sql, corpo de listar_matriz_retencao]:

```sql
    FROM public.config_retencao_etapa c
    LEFT JOIN public.usuarios_rh u ON u.id = c.alterado_por
```

`usuarios_rh` tem **as duas colunas** — `id` (PK) e `user_id` (o ponteiro para `auth.users`)
[VERIFIED: database.types.ts, bloco `usuarios_rh.Row` — contém `id: string` e `user_id: string`].

> **A junção correta é `LEFT JOIN public.usuarios_rh u ON u.user_id = h.ator`.**
> Clonar o precedente verbatim (`u.id = h.ator`) faz **zero linhas resolverem**. Todas caem no rótulo
> 3 ("Recrutador removido"), a tela fica plausível, a suíte fica verde, e o requirement é entregue
> ao contrário. É o modo de falha mais provável desta fase inteira.

### C4.2 · ⚠ `nome_completo` é `varchar(255)` — o `::text` é obrigatório

Este projeto **já shippou este bug, nesta coluna, numa RPC desta forma**. Verbatim de
`.planning/STATE.md:752` [VERIFIED: .planning/STATE.md:752]:

> `listar_matriz_retencao()` declarava `RETURNS TABLE (… text …)` mas `usuarios_rh.nome_completo` é
> `varchar(255)`: **toda chamada bem-sucedida** levantava `42804 — structure of query does not match
> function result type` desde o apply, e `/admin/retencao` não carregava para ninguém.

E as duas lições que o STATE endereça nominalmente a esta fase, verbatim de `:754-755`:

> (1) **O smoke 10/10 não pegou.** Sua única asserção sobre aquela função testava a *recusa sem
> claim* — o guard levanta na primeira linha e o `RETURN QUERY` nunca executava. Um smoke que só
> exercita o caminho de recusa não é cobertura do caminho feliz, e conta como verde do mesmo jeito.

**Consequência prescritiva:** a RPC do histórico declara `nome_completo::text` no `SELECT`, e o smoke
**tem de exercitar o caminho feliz** (uma chamada autorizada que retorna ≥1 linha), não só a recusa.

### C4.3 · ⚠ Um `SECURITY DEFINER` apaga o escopo por vaga que a Phase 32 instalou

A RLS viva não é role-only. Verbatim de
`supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql`
[VERIFIED: supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql, Part 2]:

```sql
DROP POLICY IF EXISTS rh_le_historico ON public.historico_candidatura;
CREATE POLICY rh_le_historico ON public.historico_candidatura
  FOR SELECT TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );
```

E a mesma migration registra a armadilha, verbatim de `:28-29`:

```
--   NOT depend on this policy (DEFINER bypasses row RLS); the policy closes the DIRECT
--   client SELECT leak on the audit trail.
```

Hoje `historicoCandidaturaService.listHistorico` faz um `.from('historico_candidatura').select(...)`
**direto** [VERIFIED: src/features/hub-candidato/services/historicoCandidaturaService.ts:62-67] — logo
o escopo por vaga é aplicado pela RLS. Trocar isso por uma RPC `SECURITY DEFINER` **remove esse
escopo** a menos que o corpo o reimponha. Seria uma regressão de vazamento horizontal para dentro da
fase que a Phase 32 abriu para fechar (SEG-02 / WR-04).

### C4.4 · ⚠ O candidato NÃO é DB-denied — a policy própria dele continua viva

O docblock do serviço afirma *"RH/admin only (candidate DB-denied via `rh_le_historico`)"*
[VERIFIED: src/features/hub-candidato/services/historicoCandidaturaService.ts:53-55]. **É verdade
sobre a montagem da tela, e falso sobre o banco.** Verbatim de
`supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:60-70`
[VERIFIED: supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:60-70]:

```sql
DROP POLICY IF EXISTS candidato_le_proprio_historico ON public.historico_candidatura;
CREATE POLICY candidato_le_proprio_historico ON public.historico_candidatura
  FOR SELECT USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
       WHERE candidato_id IN (
         SELECT id FROM public.candidatos WHERE user_id = (select auth.uid())
       )
    )
  );
```

E a Phase 32 declara explicitamente que **não a tocou** (`20260715000002:29-30`: *"The candidate
own-row historico read policy (20260607000006:61-70) is left intact."*).

> **Consequência de segurança direta:** uma RPC nova com `GRANT EXECUTE ... TO authenticated` fica
> chamável **pelo candidato**. Se ela devolver `nome_completo` de recrutadores, a fase cria um
> vazamento de PII de funcionário que **não existe hoje** — pela porta que ela abriu para consertar
> a exibição de um UUID.

### C4.5 · O contrato prescrito para a RPC

Combinando C4.1–C4.4 com o idioma de guard já travado no projeto:

```sql
CREATE OR REPLACE FUNCTION public.listar_historico_candidatura(p_candidatura_id uuid)
RETURNS TABLE (
  etapa_de       public.etapa_processo,
  etapa_para     public.etapa_processo,
  ator_rotulo    text,          -- resolvido no servidor; NUNCA o uuid
  criterio_texto text,
  criado_em      timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- (1) Guard NULL-SAFE. `IS DISTINCT FROM`, NUNCA `NOT IN` — o `NOT IN` falha ABERTO
  --     com claim NULL (defeito real medido na 42-06). Fecha C4.4: o candidato é recusado.
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- (2) RE-IMPOSIÇÃO DO ESCOPO POR VAGA — DEFINER bypassa a RLS `rh_le_historico`
  --     (20260715000002 Part 2). Sem este bloco a fase reabre o vazamento da SEG-02/WR-04.
  IF v_role = 'rh' AND NOT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
     WHERE c.id = p_candidatura_id AND v.created_by = (select auth.uid())
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT h.etapa_de,
         h.etapa_para,
         CASE
           -- 4 · ator IS NULL → "Sistema" (comportamento vivo hoje, HistoricoBlock.tsx:68)
           WHEN h.ator IS NULL THEN 'Sistema'
           -- 2 · o ator é o próprio titular daquela candidatura
           WHEN h.ator = cand.user_id THEN 'O próprio candidato'
           -- 1 · resolve para RH vivo → nome completo. ⚠ ::text obrigatório (varchar(255) → 42804)
           WHEN u.nome_completo IS NOT NULL THEN u.nome_completo::text
           -- 3 · não-nulo e não resolve → falha de resolução
           ELSE 'Recrutador removido'
         END,
         h.criterio_texto,
         h.criado_em
    FROM public.historico_candidatura h
    JOIN public.candidaturas cv   ON cv.id = h.candidatura_id
    JOIN public.candidatos   cand ON cand.id = cv.candidato_id
    -- ⚠ u.user_id, NUNCA u.id — `ator` FK auth.users (20260607000001:43)
    LEFT JOIN public.usuarios_rh u
           ON u.user_id = h.ator AND u.deleted_at IS NULL
   WHERE h.candidatura_id = p_candidatura_id
   ORDER BY h.criado_em DESC
   LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_historico_candidatura(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_historico_candidatura(uuid) TO authenticated;
```

Notas de contrato que o planner não pode relaxar:

- **`u.deleted_at IS NULL` no `ON`, não no `WHERE`.** Num `LEFT JOIN`, a condição no `WHERE`
  transformaria a junção em `INNER` e **apagaria as linhas** cujo ator não resolve — exatamente as
  que o rótulo 3 existe para mostrar.
- **`ativo = false` com `deleted_at IS NULL` continua exibindo o NOME** (regra travada da UI-SPEC).
  O predicado acima já entrega isso: só `deleted_at` participa.
- **A ordem dos ramos do `CASE` é load-bearing.** `ator IS NULL` tem de vir primeiro; caso contrário
  a comparação com `cand.user_id` avalia NULL e cai no `ELSE`, trocando "Sistema" por "Recrutador
  removido" — a colisão que a Correção factual 3 da UI-SPEC identificou, reintroduzida por ordem de
  cláusula.
- **`ator_rotulo` é `text`, e o UUID nunca sai da função.** A `HISTORICO_ALLOWLIST` do serviço deixa
  de projetar `ator`; o campo `ator: string | null` de `HistoricoRow` vira o rótulo resolvido.
- **`etapa_de`/`etapa_para` mantêm o tipo enum `public.etapa_processo`** — o componente já os passa
  por `ETAPA_M2_LABELS`.

**Alternativa considerada — uma VIEW com `security_invoker = true`.** Preservaria a RLS
automaticamente (fechando C4.3 e C4.4 de graça), mas **não resolve o nome**: o `LEFT JOIN` com
`usuarios_rh` seria avaliado com os direitos do chamador, e `usuarios_rh` é admin-only desde a SEG-02
— um recrutador comum veria `NULL` em toda linha. **Rejeitada por medição**, não por preferência.

### C4.6 · O ponto de edição no componente

`src/features/hub-candidato/components/HistoricoBlock.tsx:67-68`, verbatim
[VERIFIED: src/features/hub-candidato/components/HistoricoBlock.tsx:67-68]:

```tsx
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
                <span>{row.ator ?? 'Sistema'}</span>
```

A `D-47-U07` sobe `text-xs` → `text-sm` **na div inteira**. O `flex flex-wrap gap-x-3 gap-y-1` já
existe — a UI-SPEC (E5 · overflow) depende dele para que um nome completo longo quebre em vez de
empurrar a data; **não introduzir largura fixa**.

---

## C5 · CONSOL-04 — o checklist versionado de promessas

### C5.1 · O molde e os quatro idiomas que ele trava

`src/__tests__/copyPortoesLgpd.test.ts` (634 linhas). Quatro propriedades a copiar, cada uma com a
razão registrada no próprio arquivo [VERIFIED: src/__tests__/copyPortoesLgpd.test.ts:1-90]:

1. **Escopo por família, nunca repo-wide.** O docblock diz, verbatim: *"um teste que reprova o
   comportamento correto é pior que teste nenhum: ele treina quem executa a desligá-lo."* O projeto
   já produziu esse defeito **duas vezes** (43 com "automaticamente", 44 com os verbos de exclusão).
2. **Nenhum literal proibido escrito verbatim no arquivo de teste** — todos montados em runtime por
   `join` de fragmentos, *"um teste que proíbe uma string e a contém é auto-invalidante"*.
3. **Ausência de diretório NÃO é erro — é zero ocorrência.** `varrer()` começa com
   `if (!existsSync(alvo)) return []`, porque o gate roda em waves anteriores à criação do
   diretório-alvo. **Diretamente aplicável:** `src/features/transparencia/` só nasce em wave tardia.
4. **Dobra de acento preservando índices 1:1**, caractere a caractere — um `normalize('NFD')` sobre a
   string inteira desloca os índices e o relatório aponta a linha errada.

### C5.2 · A superfície realista de varredura

O requirement diz "toda promessa de retenção/exclusão em **comentário de migration ou doc**". Escopo
recomendado, e o que o torna não-vacuoso:

| Superfície | Volume | Por que entra |
|---|---|---|
| `supabase/migrations/**/*.sql` — comentários `--` e corpos de `COMMENT ON` | ~200 arquivos | É onde vive a promessa canônica (`delete_candidate_data`) |
| `docs/compliance/**/*.md` + `*.yaml` | dezenas | Onde os achados A-05/A-06 e a postura de backup vivem |

**A forma que evita as duas patologias.** Um teste que só liste strings proibidas é vacuoso (passa
sempre) ou permanentemente vermelho (e é desligado). A forma que funciona é a do próprio molde
invertida: **para cada promessa nomeada, uma âncora de código viva**. Concretamente, uma tabela
versionada no teste com `{ promessa, onde_prometida, executor_esperado, prova }`, onde `prova` é uma
asserção de existência (um `grep` por assinatura de função nas migrations, ou por caminho de arquivo)
— e o teste falha nomeando **qual promessa** perdeu seu executor.

### C5.3 · O primeiro achado que esse teste já produz hoje

Rodado mentalmente contra o estado medido, o checklist tem **pelo menos duas** entradas vermelhas no
dia em que nascer, e o plano deve prevê-las:

| # | Promessa | Onde | Executor | Estado |
|---|---|---|---|---|
| 1 | `delete_candidate_data()` (Art. 18) | `20260609000001:332-333` (`COMMENT ON TABLE`) | ausente de `pg_proc` desde a Phase 15 | **VERMELHO** — resolvido pelo CONSOL-03 (adotar + corrigir `COMMENT`) |
| 2 | *"A alteração fica registrada na trilha de auditoria"* | copy do `EditarJanelaDialog` | `PERFORM public.log_auditoria` em `salvar_janela_retencao` | **VERDE** — o executor existe (`20260801000002:424`) |
| 3 | *"`--check` reprova qualquer divergência"* | docblock de `reciboExclusao.ts` | `check:recibo-exclusao` — **não invocado por nada** | **VERMELHO** — §C2.3 |

A entrada 3 é a que fecha o laço da fase: o CONSOL-04 detecta o defeito que o TRANSP-02 ia repetir.

---

## C6 · CONSOL-01 — os vereditos Nyquist do M7

### C6.1 · ⚠ Os diretórios NÃO estão em `.planning/phases/`

Medido [VERIFIED: find sobre .planning, execução nesta sessão]:

```
.planning/milestones/v7.0-phases/36-deliverability-sender-identity
.planning/milestones/v7.0-phases/37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s
.planning/milestones/v7.0-phases/38-ef-notificar-candidato-comm
.planning/milestones/v7.0-phases/39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
.planning/milestones/v7.0-phases/40-timeline-de-prazo-no-painel-do-candidato
.planning/milestones/v7.0-phases/41-reconcilia-o-de-entrega-retry-testing
```

`.planning/phases/36-*` … `41-*` **não existem**. Um plano que use o caminho padrão criaria seis
diretórios novos e vazios ao lado do arquivo real, satisfazendo "o arquivo existe" e falhando o
requirement.

### C6.2 · O inventário de artefatos, por fase

| Fase | `VALIDATION.md` | `RESEARCH.md` | `VERIFICATION.md` | Planos | Summaries | Outros |
|---|---|---|---|---|---|---|
| **36** | ✓ `draft` (108 l.) | ✓ | ✓ | 5 | 5 | `CONTEXT`, `HUMAN-UAT`, `REVIEW` |
| **37** | **✗ ausente** | **✗ ausente** | ✓ | 5 | 5 | `CONTEXT`, `SCHEMA-VIVO` |
| **38** | ✓ `draft` (82 l.) | ✓ | ✓ | 4 | 4 | `CONTEXT`, `HUMAN-UAT` |
| **39** | ✓ `draft` (82 l.) | ✓ | ✓ | 4 | 4 | `CONTEXT`, `DISCUSSION-LOG`, `REVIEW` |
| **40** | **✗ ausente** | **✗ ausente** | ✓ | 2 | 2 | `CONTEXT` |
| **41** | ✓ `draft` (76 l.) | ✓ | ✓ | 5 | 5 | `CONTEXT`, `PATTERNS` |

Os quatro existentes carregam o mesmo frontmatter, verbatim (exemplo da 36)
[VERIFIED: .planning/milestones/v7.0-phases/36-deliverability-sender-identity/36-VALIDATION.md:1-8]:

```yaml
---
phase: 36
slug: deliverability-sender-identity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
---
```

**Observação decisiva:** os quatro `draft` **já têm** §Test Infrastructure preenchida com dados reais
(framework, config, comandos). O que falta neles não é conteúdo — é **veredito**. As duas fases sem
arquivo (37, 40) são as únicas que precisam de auditoria de conteúdo do zero, e ambas **têm**
`VERIFICATION.md`, que é a matéria-prima do veredito.

### C6.3 · O vocabulário de status e o molde de destino

O molde vivo mais rico é `.planning/phases/45-.../45-VALIDATION.md`, cujo frontmatter carrega o
comentário canônico do ciclo de vida, verbatim [VERIFIED: .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-VALIDATION.md:1-10]:

```yaml
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
```

> **Esta é a chave para o SC#4 e a decisão travada "veredito negativo é aceitável".** O par
> `status: validated` + `nyquist_compliant: false` é **exatamente** o estado "PARTIAL — cobertura
> insuficiente, eis o gap nomeado". Ele é o veredito real que o CONTEXT descreve, e ele é
> **expressável no vocabulário existente sem inventar campo novo**. Um `VALIDATION.md` que fique em
> `status: draft` continua contando como NOT-VALIDATED — ou seja, um plano que preencha as seis
> seções e não mude `status` **não fecha o requirement**.

---

## Standard Stack

### Core — tudo já instalado; **zero npm novo** (invariante do M8)

| Ferramenta | Versão medida | Papel nesta fase | Por que é o padrão |
|---|---|---|---|
| **Vitest** | 4.1.9 | O teste do CONSOL-04 e as asserções de render das 2 páginas | Harness vivo: 174 arquivos / 1696 testes [VERIFIED: npm run test:run nesta sessão] |
| **Node `fs`/`path`** | Node 20 (CI) | Varredura do CONSOL-04 e I/O do gerador | Molde `copyPortoesLgpd.test.ts` + `gen-recibo-exclusao.cjs` |
| **js-yaml** | já presente (dep. dos 2 geradores) | Leitura da fonte YAML do gerador da matriz | ⚠ `safeLoad`, nunca `load` |
| **React Router** | vivo em `src/router/routes.tsx` | As 2 rotas públicas | `/manifesto` (`routes.tsx:147`) é o precedente de rota |
| **Tailwind + glass do projeto** | vivo | Shell das 2 páginas | `BackgroundImage` + `GlassPanel`, molde de `PrivacidadeCandidatoPage` |
| **date-fns + ptBR** | vivo em `HistoricoBlock` | Datas do Histórico — **inalteradas** | Esta fase não toca `formatData` |
| **PL/pgSQL `SECURITY DEFINER`** | Postgres do Supabase | RPC do CONSOL-02 + relocação do escritor do CONSOL-03 | Idioma travado do projeto |

### Alternatives Considered

| Em vez de | Poderia usar | Tradeoff — e por que foi recusado |
|---|---|---|
| RPC DEFINER para o histórico | VIEW com `security_invoker = true` | Preservaria RLS de graça, mas **não resolve o nome**: `usuarios_rh` é admin-only e o recrutador comum veria NULL (§C4.5) |
| `DROP` de `data_deletion_log` | **Adotar** (corrigir o `COMMENT`, manter o escritor) | 11 consumidores derivados + `database.types.ts` não regenerável hoje. O critério de sucesso aceita as duas (§C1.5) |
| Fonte do gerador = seed da migration | YAML novo, autorado e datado | O seed é `ON CONFLICT DO NOTHING` — é o estado inicial, não o vigente (§C2.2) |
| `check:` só em `package.json` | `check:` no job `unit` do `ci.yml` | Um script não invocado não é portão — é o defeito que o CONSOL-04 detecta (§C2.3) |
| `react-helmet` para "indexável" | 3 propriedades verificáveis por teste de render | Invariante zero-npm do M8; já recusado pela `D-47-U11` |

**Installation:** nenhuma. `npm install` não é executado por esta fase.

---

## Package Legitimacy Audit

**Não aplicável.** Esta fase instala **zero pacotes externos**. É invariante declarada do M8
(`.planning/STATE.md:553`: *"zero npm novo, zero extensão nova"*), reafirmada pela UI-SPEC
(§Registry Safety: *"Zero dependência npm nova"*) e verificada contra o plano de trabalho: os únicos
módulos usados (`fs`, `path`, `js-yaml`, `vitest`) já estão em `package.json`.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
                     ┌──────────────────────── BUILD TIME (repo) ────────────────────────┐
                     │                                                                    │
  matriz-retencao.yaml ──┐                                                                │
  (fonte autorada,       │                                                                │
   datada, versionada)   ├──> gen-matriz-retencao.cjs ──> matrizRetencao.generated.ts ────┼──┐
  ETAPA_M2_LABELS  ──────┘         │                                                      │  │
  (triagemService)                 │ --check (2 direções)                                 │  │
                                   ▼                                                      │  │
                        ci.yml job `unit` ── falha o build quando fonte ≠ artefato        │  │
                                                                                          │  │
  pii-inventory.yaml ──> gen-recibo-exclusao.cjs ──> reciboExclusao.generated.ts ─────────┼──┤
                                   │                                                      │  │
                                   └── check:recibo-exclusao ── ⚠ ÓRFÃO HOJE → vai p/ CI  │  │
                     └────────────────────────────────────────────────────────────────────┘  │
                                                                                              │
                     ┌──────────────────────── RUNTIME (browser) ────────────────┐            │
                     │                                                            │            │
  visitante ──> /privacidade ──────> import estático ◄─────────────────────────────────────────┘
       │              │  (zero useQuery, zero rede, zero estado assíncrono)
       │              └──> Bloco 1 matriz · Bloco 2 recibo · 3 links · 4 direitos · 5 honestidade
       │
       ├────> /subprocessadores ──> import estático de subprocessadores.ts
       │                              (6 fichas · país BLOQUEANTE — §C3.2)
       │
       └────> RodapePublico  montado em  / · /vagas · /vagas/:identifier · e nas 2 novas
                     └──────────────────────────────────────────────────────────┘

                     ┌──────────────── RUNTIME (autenticado, RH) ────────────────┐
  recrutador ──> HubCandidatoRH ──> HistoricoBlock
                       │                  │
                       │                  └──> historicoCandidaturaService
                       │                             │
                       │                             ▼
                       │                   rpc('listar_historico_candidatura')
                       │                             │  SECURITY DEFINER
                       │                             ├── guard papel (IS DISTINCT FROM)   ← fecha C4.4
                       │                             ├── re-impõe escopo por vaga         ← fecha C4.3
                       │                             └── LEFT JOIN usuarios_rh
                       │                                   ON u.user_id = h.ator          ← C4.1
                       │                                   nome_completo::text            ← C4.2
                       │                                      │
                       └──────────────────────────────────────┴──> 4 rótulos, nunca UUID
                     └───────────────────────────────────────────────────────────┘

                     ┌──────────────── ADMIN (o detector de drift) ──────────────┐
  administrador ──> /admin/retencao ──> EditarJanelaDialog ──> salvar_janela_retencao (RPC)
                            │                                          │
                            │                                          └──> config_retencao_etapa
                            └──> Emenda A: "a página pública não muda sozinha"  ← única ponte
                                  entre a edição de RUNTIME e o artefato de BUILD
                     └───────────────────────────────────────────────────────────┘
```

O diagrama torna visível o risco central: **a única seta entre a edição de runtime e o artefato de
build-time é uma frase de copy.** É por isso que a Emenda A não é cosmética.

### Recommended Project Structure

```
src/features/transparencia/
├── components/
│   ├── PrivacidadePublicaPage.tsx     # /privacidade — 5 blocos, zero hook
│   ├── SubprocessadoresPage.tsx       # /subprocessadores — fichas, zero hook
│   ├── MatrizRetencaoPublica.tsx      # 8 fichas do .generated.ts
│   ├── RetencaoIndeterminadaLista.tsx # derivado de RECIBO_EXCLUSAO.colunas_mantem
│   ├── SubprocessadorFicha.tsx        # UM componente para as 6 (nunca dois)
│   └── RodapePublico.tsx              # alcançabilidade — 2 links, min-h-[44px]
└── constants/
    ├── matrizRetencao.generated.ts    # ⚠ GERADO — cabeçalho "NÃO EDITAR À MÃO"
    ├── subprocessadores.ts            # autorado; check: reprova campo vazio
    └── copyTransparencia.ts           # COPY_TRANSPARENCIA — zero literal em JSX

docs/compliance/
├── matriz-retencao.yaml               # FONTE do gerador (§C2.2) — datada
└── sql/gen-matriz-retencao.cjs        # molde verbatim de gen-recibo-exclusao.cjs
```

### Pattern 1 · Artefato gerado com `--check` que reprova nas duas direções

**O quê:** uma fonte versionada, um script `.cjs` sem dependência de rede, N artefatos, um `--check`
que confere cada artefato separadamente e sai 1 na primeira divergência.
**Quando usar:** sempre que uma declaração pública tiver de espelhar dado de configuração.
**Os três detalhes load-bearing** (§C2.4): pin do carimbo de tempo no modo `--check`; conferência
separada por artefato; ausência tratada como divergência.

### Pattern 2 · RPC `SECURITY DEFINER` com guard NULL-safe no corpo

**O quê:** `SET search_path = ''`, referências totalmente qualificadas, guard como **primeiro**
statement, `REVOKE ALL FROM PUBLIC` seguido de `GRANT EXECUTE TO authenticated`.
**A regra que não é estilo**, verbatim de `20260801000002_p43_config_retencao.sql:338-351`
[VERIFIED: supabase/migrations/20260801000002_p43_config_retencao.sql:338-351]:

```
  -- ⚠ O idioma difundido neste repositório — `IF v_role NOT IN ('rh','administrador')`
  -- — é NULL-CEGO: com `v_role` NULL (chamador sem JWT), a expressão avalia NULL, um
  -- `IF` NULL **não é tomado**, e o guard FALHA ABERTO.
```

**Corolário desta fase (§C4.3):** DEFINER bypassa RLS, logo qualquer escopo que a RLS impunha
**tem de ser reescrito no corpo**. Um guard de papel sozinho não é substituto de um escopo por linha.

### Pattern 3 · Auditar na MESMA transação via `PERFORM public.log_auditoria(...)`

**O quê:** a mutação e o seu registro no mesmo corpo de função → commitam ou revertem juntos.
**Precedentes vivos:** `20260713000003:120,184` (Phase 13) e `20260801000002:424` (Phase 43).
**Onde entra:** é o destino da relocação do escritor do `data_deletion_log` (§C1.4).

### Pattern 4 · Teste de portão com escopo declarado por família

**O quê:** cada família de string proibida carrega o seu próprio escopo de varredura; nenhum literal
proibido aparece verbatim no arquivo de teste; diretório ausente = zero ocorrência.
**Precedente:** `copyPortoesLgpd.test.ts` (§C5.1).

### Anti-Patterns to Avoid

- **Clonar `listar_matriz_retencao` verbatim para o histórico.** A chave de junção é outra (§C4.1) —
  o clone entrega a tela ao contrário com a suíte verde.
- **`RETURNS TABLE (… text …)` sem `::text` sobre `usuarios_rh.nome_completo`.** `varchar(255)` →
  `42804` em **toda** chamada bem-sucedida (§C4.2). Já aconteceu neste repositório.
- **Smoke que exercita só o caminho de recusa.** Passa 10/10 e não cobre nada — a lição literal de
  STATE.md:754.
- **Adicionar `check:` a `package.json` e parar.** Um script não invocado não é portão (§C2.3).
- **`u.deleted_at IS NULL` no `WHERE` de um `LEFT JOIN`.** Converte para `INNER` e apaga as linhas
  que o rótulo "Recrutador removido" existe para mostrar.
- **`useQuery` nas páginas públicas "por consistência".** Reabre a superfície `anon` que o CONTEXT
  rejeitou e cria 6 estados de tela intestáveis (Invariante 6).
- **Importar `ENCARREGADO_EMAIL` de `AutorizacoesLista.tsx`.** A constante canônica é
  `src/features/privacidade/constants/encarregado.ts:23`; `AutorizacoesLista` apenas a re-exporta
  [VERIFIED: src/features/privacidade/constants/encarregado.ts:23 + AutorizacoesLista.tsx:35,45].
- **Escrever `.planning/phases/36-.../36-VALIDATION.md`.** O diretório real é
  `.planning/milestones/v7.0-phases/` (§C6.1).
- **Deixar o `VALIDATION.md` em `status: draft`.** Continua contando como NOT-VALIDATED (§C6.3).

---

## Don't Hand-Roll

| Problema | Não construa | Use | Por quê |
|---|---|---|---|
| Serializar/conferir artefato gerado | Um `--check` novo com contrato próprio | Copiar `gen-recibo-exclusao.cjs` verbatim | Portões que reprovam de jeitos diferentes fazem um deles parar de ser lido (UI-SPEC §reuso 4) |
| Rótulos pt-BR das 8 etapas | Um segundo mapa de rótulos | `ETAPA_M2_LABELS` / `ETAPA_M2_OPTIONS` | Página pública e tela de RH chamariam a mesma etapa por nomes diferentes |
| Bloco "o que fica" de `/privacidade` | Redigir a lista à mão | `RECIBO_EXCLUSAO.colunas_mantem` | Já gerado, já traz base legal por item, já usa "sem ligação com você" |
| E-mail do Encarregado | Um literal novo | `ENCARREGADO_EMAIL` de `constants/encarregado.ts` | Dois endereços divergentes em duas páginas de privacidade |
| Trilha de auditoria do rollback | Uma tabela de audit nova | `PERFORM public.log_auditoria(...)` | Sink canônico, DEFINER + BYPASSRLS, sobrevive ao REVOKE da P28 |
| Escopo por vaga na RPC nova | Reinventar o predicado | Copiar `rh_le_historico` (`20260715000002` Part 2) verbatim | O predicado é o do WR-04, já auditado; reescrevê-lo é reabrir a auditoria |
| Parsing de YAML no gerador | Um parser novo | `js-yaml` com **`safeLoad`** | Zero npm novo; `load` usa schema full e é achado de auditoria |
| Metadados de SEO | `react-helmet` | 3 propriedades verificáveis por teste de render | Invariante zero-npm; `D-47-U11` |
| Mascaramento de PII para a copy de IA | Descrever "de forma anônima" | Enumerar as 7 classes que `maskPII` de fato remove | O regex não alcança nome próprio (§C3.3) |

**Key insight:** neste repositório, quase toda peça que esta fase precisa **já existe uma casa
adiante** — o gerador, o sink de auditoria, o predicado de escopo, os rótulos, o recibo, a constante
do Encarregado. O trabalho real da fase não é construir; é **religar corretamente**, e cada religação
tem exatamente um detalhe que, errado, deixa a suíte verde e o requirement por entregar.

---

## Common Pitfalls

### Pitfall 1 · A junção do histórico pelo lado errado (severidade: ALTA)

**O que dá errado:** `LEFT JOIN usuarios_rh u ON u.id = h.ator` — zero linhas resolvem.
**Por que acontece:** o precedente que a UI-SPEC manda clonar junta por `u.id`, e `usuarios_rh` tem
as duas colunas, então nada no tipo denuncia o erro.
**Como evitar:** `u.user_id = h.ator`. A migration de origem grita isso em `:18-19`.
**Sinais de alerta:** toda linha do Histórico lendo "Recrutador removido" num banco com recrutadores
vivos. **Verificação:** o smoke exige ≥1 linha resolvendo para um nome real.

### Pitfall 2 · `42804` em `RETURNS TABLE` sobre `varchar(255)` (severidade: ALTA)

**O que dá errado:** toda chamada bem-sucedida levanta `42804`; a tela não carrega para ninguém.
**Por que acontece:** `nome_completo` é `varchar(255)` e o `RETURNS TABLE` declara `text`.
**Como evitar:** `u.nome_completo::text`. Regra já viva no repo (`44-02-SUMMARY.md:125`).
**Sinais de alerta:** o smoke passa e a tela não abre — porque o smoke só testou a recusa.

### Pitfall 3 · DEFINER apaga o escopo por vaga (severidade: ALTA — segurança)

**O que dá errado:** um recrutador passa a ler o histórico de candidaturas de vagas que não são dele.
**Por que acontece:** hoje o escopo vem da RLS; a RPC DEFINER a bypassa por definição.
**Como evitar:** re-impor o predicado de `rh_le_historico` no corpo (§C4.5, bloco 2).
**Sinais de alerta:** nenhum na UI — o vazamento é silencioso. **Verificação:** asserção negativa —
um recrutador B chamando a RPC com uma `candidatura_id` da vaga do recrutador A recebe `42501`.

### Pitfall 4 · A RPC nova fica chamável pelo candidato (severidade: ALTA — segurança)

**O que dá errado:** `GRANT EXECUTE TO authenticated` + candidato autenticado = nomes de recrutadores
expostos a candidatos, num vazamento que não existe hoje.
**Por que acontece:** o docblock do serviço diz "candidate DB-denied" e é falso no banco (§C4.4).
**Como evitar:** guard de papel `IS DISTINCT FROM` recusando quem não é `rh`/`administrador`.
**Verificação:** asserção negativa com JWT de candidato → `42501`.

### Pitfall 5 · O `check:` novo nasce órfão (severidade: MÉDIA — mas é o tema da fase)

**O que dá errado:** o portão da matriz de retenção não roda em lugar nenhum e a página apodrece.
**Por que acontece:** o CONTEXT e a UI-SPEC afirmam que o molde está no pre-commit; não está.
**Como evitar:** entrada no job `unit` do `ci.yml`, ao lado de `check:export-allowlist`.
**Sinais de alerta:** o `check:` passa localmente e ninguém sabe dizer quando ele rodou por último.

### Pitfall 6 · A ordem dos ramos do `CASE` reintroduz a colisão de rótulos (severidade: MÉDIA)

**O que dá errado:** `ator IS NULL` comparado a `cand.user_id` avalia NULL, cai no `ELSE`, e "Sistema"
vira "Recrutador removido" — a colisão que a Correção factual 3 identificou, por outro caminho.
**Como evitar:** `WHEN h.ator IS NULL THEN 'Sistema'` é o **primeiro** ramo.
**Verificação:** os quatro recortes do backstop E5 · partial da UI-SPEC, cada um isolado.

### Pitfall 7 · O `DROP` deixa 11 mentiras (severidade: ALTA)

**O que dá errado:** dois YAML-fonte, um catálogo, um gerador, cinco artefatos, os tipos e uma string
de produto passam a descrever um objeto inexistente. Dois deles são **artefatos de compliance que se
declaram autoridade**.
**Como evitar:** adotar (§C1.5); ou, se dropar, os sete passos na ordem.
**Sinais de alerta:** `check:export-allowlist` vermelho no CI é o **único** dos onze que grita.

### Pitfall 8 · O gerador da matriz publica o seed em vez do vigente (severidade: MÉDIA)

**O que dá errado:** a página afirma `24 meses` para uma etapa que o administrador já encurtou.
**Por que acontece:** o único dado no repositório é o `VALUES` do seed, `ON CONFLICT DO NOTHING`.
**Como evitar:** fonte YAML autorada + data de **medição** da matriz viva carimbada no artefato; o
carimbo "Política vigente em {data}" é essa data, não a do build.

### Pitfall 9 · O `país` tratado como tarefa de wave em vez de pré-requisito (severidade: ALTA)

**O que dá errado:** a wave da página chega e nenhuma das seis entradas embarca → página vazia →
falha de geração → a wave inteira trava.
**Como evitar:** a medição do `país` é checkpoint do orquestrador **antes** da wave da página.

### Pitfall 10 · Migration com `BEGIN;/COMMIT;` externo (severidade: MÉDIA)

**O que dá errado:** `42601 — cannot insert multiple commands into a prepared statement` no
transaction pooler. **Como evitar:** CLAUDE.md § workaround PL/pgSQL — sem wrapper externo, com
o comando `supabase migration repair --status applied <version>` no cabeçalho.

---

## Runtime State Inventory

Esta fase **não é** rename/refactor/migração de dados, mas o CONSOL-03 toca um objeto de banco vivo e
o CONSOL-02 troca um caminho de leitura. O inventário é registrado por isso.

| Categoria | Itens encontrados | Ação requerida |
|---|---|---|
| **Dados armazenados** | `public.data_deletion_log` — 4 colunas, sem FK, sem `candidato_id`. Contagem de linhas em PROD **NÃO medida nesta sessão** (sem MCP no subagente). O CONTEXT afirma 0 linhas; o escritor da prompt-library está vivo desde 2026-06-09, então ≥0 e possivelmente >0. **Medir antes de qualquer `DROP`.** | Medição = checkpoint do orquestrador |
| **Dados armazenados** | `config_retencao_etapa` — 8 linhas seedadas em `24`. Se um administrador já editou em PROD, `origem = 'admin'`. **Estado vivo não medido.** | Medição = checkpoint; alimenta o carimbo de vigência (§C2.2) |
| **Config de serviço vivo** | Região de projeto Supabase, região Vercel, região Resend — **nenhuma no git** (§C3.2) | Medição humana; bloqueante de embarque |
| **Estado registrado no SO** | Nenhum. Esta fase não registra cron, task nem processo. | — Verificado por ausência de mudança em `pg_cron`/scripts |
| **Segredos / env vars** | Nenhum novo. `SUPABASE_ACCESS_TOKEN` é **ausente** do ambiente e é pré-requisito de `npm run db:types` | Desbloqueio humano se o `DROP` for escolhido |
| **Artefatos de build / pacotes** | `database.types.ts` — gerado, e **hoje não regenerável** (§Environment). Cinco artefatos `.generated`/`.json` sob geradores. | Regenerar os 5 se o CONSOL-03 mexer nas fontes; `db:types` = checkpoint |

---

## Code Examples

### Cabeçalho obrigatório de migration (CLAUDE.md § workaround PL/pgSQL)

```sql
-- =============================================================================
-- Migration: p47_listar_historico_candidatura
-- Date: 2026-08-XX
-- Phase: 47 (Transparência & Consolidação) / Plan 47-XX
-- Requirement: CONSOL-02 (VISRH-03 / W-1)
-- =============================================================================
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper — o driver do Supabase CLI já envolve
-- cada migration na própria transação implícita, e o wrapper externo é o gatilho do
-- `42601 — cannot insert multiple commands into a prepared statement` no transaction
-- pooler (CLAUDE.md § "Migrations + db push — workaround conhecido (PL/pgSQL)").
--
-- Após apply manual pelo SQL Editor:
--   supabase migration repair --status applied 20260809000001
--   supabase db push --linked   # deve responder "Remote database is up to date"
-- =============================================================================
```

### Relocação do escritor do CONSOL-03 (se a rota `DROP` for escolhida)

```sql
-- Substitui o INSERT em data_deletion_log pelo sink canônico, na MESMA transação.
-- Idioma: 20260713000003:120 (P13) e 20260801000002:424 (P43).
-- Enums MEDIDOS vivos: categoria_log_auditoria (database.types.ts:5527-5537),
--                      severidade_log (:5580). Nenhum valor novo.
  PERFORM public.log_auditoria(
    p_usuario_id   := (select auth.uid()),
    p_usuario_tipo := 'admin',
    p_acao         := 'rollback_prompt_version',
    p_categoria    := 'configuracao',
    p_descricao    := format('Rollback de %s para a versao %s', p_call_type, p_semver),
    p_severidade   := 'aviso',
    p_recurso_tipo := 'prompt_versions',
    p_recurso_id   := v_target_id,
    p_dados_antes  := NULL,
    p_dados_depois := jsonb_build_object('call_type', p_call_type, 'semver', p_semver),
    p_sucesso      := true
  );
```

⚠ A ordem e os nomes dos parâmetros acima seguem a assinatura registrada em
`20260713000003:38-39`; os quatro últimos (`p_recurso_tipo`, `p_recurso_id`, `p_dados_antes`,
`p_dados_depois`, `p_sucesso`) são lidos do call-site vivo de `salvar_janela_retencao`
(`20260801000002:424-435`). **A assinatura completa não foi lida em `pg_proc` nesta sessão** —
confirmar antes do apply. [ASSUMED — a aridade exata da função]

### O `--check` do gerador (esqueleto no molde verbatim)

```js
if (args.includes('--check')) {
  let discoJson = null;
  try { discoJson = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')); }
  catch { morrer(`DIVERGENTE: ${REL(OUT_JSON)} ausente ou ilegível.\n  Rode: node ${GERADOR}`); }

  const doc = construir();
  // Pin obrigatório: sem ele o --check diverge pelo relógio e nunca sai 0.
  doc.meta.gerado_em = discoJson.meta && discoJson.meta.gerado_em;

  if (fs.readFileSync(OUT_JSON, 'utf8') !== serializarJson(doc)) {
    morrer(`DIVERGENTE: ${REL(OUT_JSON)} não corresponde à fonte.\n  Rode: node ${GERADOR}`);
  }
  // Cada consumidor conferido SEPARADAMENTE; ausência conta como divergência.
  for (const [saida, consumidor] of [[OUT_TS_APP, 'página pública (src/features/transparencia/)']]) {
    const disco = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
    if (disco !== serializarTs(doc, consumidor)) {
      morrer(`DIVERGENTE: ${REL(saida)} ${disco === '' ? 'ausente' : 'não corresponde'} à fonte.`);
    }
  }
  process.exit(0);
}
```

### A entrada do portão no CI (o precedente vivo a copiar)

```yaml
      # ci.yml job `unit`, imediatamente após `- run: npm run check:export-allowlist`
      - run: npm run check:matriz-retencao
      - run: npm run check:recibo-exclusao   # ⚠ conserta o órfão do 45-02 (§C2.3)
```

---

## State of the Art

| Abordagem antiga | Abordagem atual | Quando mudou | Impacto nesta fase |
|---|---|---|---|
| Guard `IF v_role NOT IN (...)` | `IS DISTINCT FROM` (NULL-safe) | Phase 42 (42-06) | O `NOT IN` falha ABERTO com claim NULL — obrigatório na RPC do CONSOL-02 |
| `RETURNS TABLE (… text …)` sobre `varchar` | `::text` explícito na projeção | Phase 43 (`20260803000001`) | Evita o `42804` que já derrubou `/admin/retencao` |
| RLS role-only em `historico_candidatura` | RLS **vaga-scoped** (WR-04) | Phase 32 (`20260715000002`) | Uma RPC DEFINER tem de reimpor o escopo, ou regride |
| Copy de compliance redigida à mão | Artefato **gerado** com `--check` | Phase 45 (45-02) | O molde declarado do TRANSP-02 |
| `check:` só definido em `package.json` | `check:` invocado no CI | Phase 44 (WR-08) | O precedente que corrige o buraco do §C2.3 |
| Gate `tsc` binário | Gate de **não-regressão** contra baseline congelada | Phase 42 (42-01) | Torna "zero `--no-verify`" honestamente satisfazível |

**Deprecated / desatualizado:**

- **`data_deletion_log` como trilha de exclusão de titular** — nunca foi. A promessa
  `delete_candidate_data` do `COMMENT` morreu com a Phase 15; o motor real de exclusão é a RPC de
  anonimização da Phase 45 (`20260805000006`).
- **`historico_acoes`** (era Figma-Make, FK `usuarios_rh.id`) — fora de escopo, e a fonte da confusão
  de chave do §C4.1. Não confundir com `historico_candidatura`.
- **`/manifesto` como precedente de alcançabilidade** — é precedente de rota apenas
  (`routes.tsx:147` + `DevNavigationMenu` gateado por `import.meta.env.DEV`).

---

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|---|---|---|
| A1 | Os países/regiões inferidos na tabela de §C3.2 (Anthropic/OpenAI = EUA, ViaCEP = Brasil, Resend default EUA) | §C3.2 | **ALTO.** Declaração pública falsa de transferência internacional — o gênero exato de artefato que a ANPD lê como evidência. A Invariante 5 exige fato medido; **nenhum destes é medido** |
| A2 | A aridade e a ordem exata dos parâmetros de `public.log_auditoria(...)` | §Code Examples | MÉDIO. A migration falharia no apply com erro claro (função não encontrada) — falha barulhenta, não silenciosa |
| A3 | `data_deletion_log` tem 0 linhas em PROD (afirmado pelo CONTEXT, não medido nesta sessão) | §Runtime State | **ALTO se `DROP`.** O escritor está vivo desde 2026-06-09; um `DROP` sobre linhas reais perde trilha de auditoria de rollbacks já executados |
| A4 | `config_retencao_etapa` em PROD ainda tem as 8 janelas em `24` | §C2.2 | MÉDIO. A página publicaria `24` para uma etapa já encurtada — mentira sobre política de retenção |
| A5 | O `gsd-nyquist-auditor` consegue emitir veredito a partir de PLAN/SUMMARY/VERIFICATION sem re-executar as fases | §C6 | BAIXO. Se não conseguir, o veredito honesto é "cobertura insuficiente" — que a decisão travada declara aceitável |
| A6 | Vitest e o CI aceitam um teste que varre `supabase/migrations/**` (fora de `src/`) | §C5.2 | BAIXO. `copyPortoesLgpd.test.ts` já usa `resolve(__dirname, '../..')` como raiz e lê fora de `src/` |
| A7 | Nenhuma tela lê `data_deletion_log` (baseado em varredura repo-wide, não em `pg_stat`) | §C1.2 | BAIXO. A varredura cobriu `src/`, `supabase/` e migrations; um consumidor externo ao repo é improvável |

**A1 é a única que bloqueia embarque.** As demais são medíveis dentro do plano ou falham
barulhentamente.

---

## Open Questions

### 1. CONSENT-05 é um segundo item destrutivo desta fase — o CONTEXT diz que só há um

**O que sabemos:** `REQUIREMENTS.md:197` registra, verbatim
[VERIFIED: .planning/REQUIREMENTS.md:197]:

> | CONSENT-05 | **Phase 47** | Deferred (a COLETA parou na 43 … O que resta é
> `autorizacao_analise_video NOT NULL DEFAULT false` … o `DROP`/`ALTER` é decisão da 47 sob portão
> destrutivo …) |

E `:256` é ainda mais explícito: *"`DROP` de coluna com escritor vivo é exatamente o que o portão de
fase destrutiva cobre na **47** (CONSOL-03)."*

**O que não está claro:** o `47-CONTEXT.md` afirma *"Portão destrutivo aplica-se a UM item só:
CONSOL-03"* e não menciona CONSENT-05 em lugar nenhum — nem em `<decisions>`, nem em `<deferred>`.
A coluna está viva e referenciada em 14 sítios de `src/` e `supabase/`, incluindo
`exportAllowlist.ts:175,196` e `reciboExclusao.generated.ts:112` (ambos artefatos **gerados**).

**Recomendação:** **não** planejar CONSENT-05 nesta fase sem decisão explícita do operador. Duas
razões: (i) o CONTEXT é o artefato mais recente e é categórico; (ii) um segundo `DROP` de schema
multiplicaria por dois o custo do portão destrutivo do M8 numa fase cujo trabalho principal é
aditivo. Registrar como item de portão a decidir, com o ponteiro para
`todos/pending/43-analise-video-default-false-fabrica-afirmacao.md`.

### 2. `DROP` ou adoção do `data_deletion_log` — a pesquisa recomenda adoção, o CONTEXT prefere `DROP`

**O que sabemos:** o CONTEXT trava *"DROP, mas só depois de religar o escritor vivo"* e declara a
saída de escape *"se religar o escritor não for trivial, adotar"*.
**O que não está claro:** o critério de acionamento da escape hatch é a dificuldade de **religar o
escritor** — que é trivial. A dificuldade medida está no **`DROP`**, que o critério não cobre.
**Recomendação:** o plano apresenta as duas rotas com o custo medido (§C1.5) e trata a escolha como
**checkpoint do operador na wave 1**, antes de qualquer escrita. Adotar mantém a fase inteiramente
aditiva e dispensa o portão destrutivo do M8.

### 3. A fonte do gerador da matriz — YAML novo ou parse do seed?

**O que sabemos:** o molde lê YAML versionado e não fala com o banco; a matriz não tem YAML.
**O que não está claro:** se um YAML autorado ainda satisfaz *"derivada da matriz de retenção como
dado, não redigida à mão"* (SC#1), dado que o YAML **é** autorado à mão.
**Recomendação:** YAML autorado **cuja conformidade com a matriz viva é medida e datada** —
o artefato carrega `medido_em` + o método (mesmo padrão de `catalogo-vivo-44.json:2-8`, que se
declara *"information_schema via execute_sql do MCP, pelo orquestrador"*). Isso torna a derivação
auditável sem exigir que o gerador acesse o banco.

### 4. O `país` de Vercel para um SPA estático

**O que sabemos:** `vercel.json` não declara `regions`; o conteúdo é estático servido por rede de
borda global.
**O que não está claro:** qual é a resposta honesta para "país" quando o tratamento é distribuído.
**Recomendação:** decisão do Encarregado no gate de publicação. A formulação candidata é descrever o
**fato** (rede de distribuição global, com a empresa e a sua jurisdição nomeadas) em vez de forçar um
país único — mas isso muda a forma do campo, e a Invariante 5 proíbe "não informado". **Não decidir
sem o Encarregado.**

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|---|---|---|---|---|
| Node | geradores + Vitest | ✓ | 20 (CI) | — |
| Vitest | CONSOL-04 + testes de render | ✓ | 4.1.9 | — |
| `js-yaml` | gerador da matriz | ✓ | dep. viva dos 2 geradores | — |
| Supabase CLI | `db:types`, `db push`, `migration repair` | **✗** | — | Apply manual pelo SQL Editor (workaround do CLAUDE.md) |
| `SUPABASE_ACCESS_TOKEN` | `db:types`, Management API (região) | **✗** | — | Nenhum |
| MCP Supabase (subagente) | medir PROD, aplicar migration | **✗ por desenho** | — | Checkpoint do orquestrador (STATE.md:552) |
| Deno | corpus de EFs | não verificado nesta sessão | — | Esta fase não toca EF (exceto se o CONSOL-03 regerar `_shared/*.ts`) |

**Dependências ausentes SEM fallback (bloqueantes):**

- **`SUPABASE_ACCESS_TOKEN` / Supabase CLI** — bloqueiam (i) a regeneração de `database.types.ts`
  após qualquer `DROP`, e (ii) a medição da região do projeto via Management API. O
  `44-07-SUMMARY`/STATE.md:747 já registra este bloqueio como conhecido e não resolvido:
  *"database.types.ts NAO regenerado — auth gate do Supabase CLI (sem SUPABASE_ACCESS_TOKEN e sem
  supabase login)"*.
- **MCP Supabase para subagentes** — não é falha, é premissa. `.planning/STATE.md:552`, verbatim:
  *"**subagentes GSD não recebem os tools MCP do Supabase** — toda migration, inspeção PROD e deploy
  de EF é checkpoint do orquestrador."* **Isto é premissa de planejamento de wave, não descoberta de
  meio de fase.**

**Dependências ausentes COM fallback:**

- **Supabase CLI para `db push`** → apply manual pelo SQL Editor + `migration repair --status
  applied <version>`, que é o caminho estabelecido pelo CLAUDE.md e usado desde a Phase 4.

---

## Validation Architecture

`workflow.nyquist_validation` está `true` em `.planning/config.json`
[VERIFIED: .planning/config.json].

### Test Framework

| Propriedade | Valor |
|---|---|
| Framework | **Vitest 4.1.9** (config inline em `vite.config.ts`, bloco `test`) |
| Config file | `vite.config.ts` — `environment: 'happy-dom'`, `setupFiles: ['./tests/setup.ts']` |
| Quick run command | `npx vitest run <caminho tocado>` (ex.: `npx vitest run src/features/transparencia`) |
| Full suite command | `npm run test:run` · `npm run lint` · `npm run build` · `npm run check:export-allowlist` · `npm run check:recibo-exclusao` |
| Smokes SQL | `supabase/tests/` — executados por MCP `execute_sql` numa **única chamada** (checkpoint do orquestrador) |

**Baselines medidas nesta sessão** [VERIFIED: execução em 2026-08-09]:

| Métrica | Valor |
|---|---|
| Vitest | **1696 passed / 1696** · **174 arquivos** · 7,70 s |
| `tsc --noEmit` | **97 erros** — bate exatamente com a baseline congelada do `.husky/pre-commit` |
| `check:export-allowlist` | **OK** |
| `check:recibo-exclusao` | **OK** |

⚠ `npm run lint` **não é gate binário** — é não-regressão contra 97 (local) / 104 (CI). Por isso
"zero `--no-verify`" é honestamente satisfazível.

### Phase Requirements → Test Map

| Req | Comportamento | Tipo | Comando automatizado | Existe? |
|---|---|---|---|---|
| TRANSP-01 | `/subprocessadores` renderiza N fichas com os 5 campos, nenhum vazio | unit (render) | `npx vitest run src/features/transparencia` | ❌ Wave 0 |
| TRANSP-01 | Nenhuma entrada embarca com campo vazio / "não informado" / "a definir" | unit (gate) | idem | ❌ Wave 0 |
| TRANSP-01 | A lista publicada cobre todo destino de rede declarado em `src/**` + `supabase/functions/**` | unit (varredura) | idem | ❌ Wave 0 |
| TRANSP-02 | `check:matriz-retencao` reprova nas duas direções | script | `npm run check:matriz-retencao` | ❌ Wave 0 |
| TRANSP-02 | Etapa sem chave de finalidade **reprova a build** (não renderiza ficha vazia) | unit (gerador) | `npx vitest run docs/compliance` ou teste do gerador | ❌ Wave 0 |
| TRANSP-02 | As 8 fichas na ordem de `ETAPA_M2_OPTIONS`, sem agrupamento | unit (render) | `npx vitest run src/features/transparencia` | ❌ Wave 0 |
| TRANSP-02 | Carimbo de vigência presente e com data válida em ambas as páginas | unit (render) | idem | ❌ Wave 0 |
| TRANSP-02 | `DIALOGO_JANELA_COPY.confirmacao.publicacao` existe **e é renderizada** no `AlertDialog` (Emenda A) | unit (render) | `npx vitest run src/features/admin/retencao` | ❌ Wave 0 |
| TRANSP-01/02 | Bans de copy no escopo `src/features/transparencia/` = 0 | unit (gate) | `npx vitest run src/__tests__` | ❌ Wave 0 |
| TRANSP-01/02 | Cada link do `RodapePublico` carrega `min-h-[44px]` | unit (estrutural) | `npx vitest run src/features/transparencia` | ❌ Wave 0 |
| CONSOL-02 | Os 4 rótulos, um teste por recorte + asserção negativa de UUID/célula vazia | unit (render) | `npx vitest run src/features/hub-candidato` | ❌ Wave 0 |
| CONSOL-02 | Nome longo renderiza íntegro (sem `truncate`/`line-clamp`/`title`) | unit (render) | idem | ❌ Wave 0 |
| CONSOL-02 | `HISTORICO_ALLOWLIST` continua explícita, nunca `'*'`, sem `email` nem `id` de RH | unit (gate) | idem | ⚠ parcial — o arquivo existe |
| CONSOL-02 | **Caminho feliz** da RPC: chamada autorizada devolve ≥1 linha com nome resolvido | smoke SQL | `supabase/tests/p47_historico_smoke.sql` | ❌ Wave 0 — checkpoint |
| CONSOL-02 | **Negativa:** recrutador B recebe `42501` para candidatura da vaga do recrutador A | smoke SQL | idem | ❌ Wave 0 — checkpoint |
| CONSOL-02 | **Negativa:** JWT de candidato recebe `42501` | smoke SQL | idem | ❌ Wave 0 — checkpoint |
| CONSOL-03 | Rollback grava em `logs_auditoria` (se relocado) / `COMMENT` corrigido (se adotado) | smoke SQL | `supabase/tests/p47_consol03_smoke.sql` | ❌ Wave 0 — checkpoint |
| CONSOL-03 | **Negativa:** contagem de `prompt_versions` inalterada pelo trabalho da fase | smoke SQL | idem | ❌ Wave 0 — checkpoint |
| CONSOL-04 | Toda promessa nomeada tem executor vivo; falha **nomeando** a promessa órfã | unit (varredura) | `npx vitest run src/__tests__` | ❌ Wave 0 |
| CONSOL-01 | 6 `VALIDATION.md` existem em `.planning/milestones/v7.0-phases/` com `status: validated` | manual/doc | inspeção | ❌ Wave 0 |

### Sampling Rate

- **Por commit de task:** `npx vitest run <caminho tocado>` + o gate `tsc` do pre-commit (≤97)
- **Por merge de wave:** `npm run test:run` + `npm run lint` + os três `check:`
- **Portão de fase:** suíte cheia verde + `npm run build` + os três `check:` verdes antes de
  `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `docs/compliance/matriz-retencao.yaml` — a fonte do gerador (§C2.2)
- [ ] `docs/compliance/sql/gen-matriz-retencao.cjs` — molde verbatim de `gen-recibo-exclusao.cjs`
- [ ] `package.json` → `check:matriz-retencao` **+ entrada no job `unit` do `ci.yml`**
- [ ] `ci.yml` → `check:recibo-exclusao` (conserta o órfão do 45-02 — §C2.3)
- [ ] `src/features/transparencia/__tests__/` — render das 2 páginas, bans de copy, alvo tátil
- [ ] `src/features/hub-candidato/__tests__/` — os 4 rótulos do `ator` (arquivo pode já existir)
- [ ] `src/__tests__/promessasComExecutor.test.ts` — o checklist do CONSOL-04
- [ ] `supabase/tests/p47_historico_smoke.sql` — caminho feliz + as 2 asserções negativas
- [ ] `supabase/tests/p47_consol03_smoke.sql` — o desfecho escolhido do CONSOL-03

Nenhuma instalação de framework é necessária — Vitest, happy-dom e o harness de smoke SQL já existem.

---

## Security Domain

`security_enforcement` não está desabilitado em `.planning/config.json` → habilitado.

### Applicable ASVS Categories

| Categoria ASVS | Aplica | Controle padrão nesta fase |
|---|---|---|
| **V1 Architecture** | sim | Escopo de acesso movido de RLS para corpo de RPC — mudança de tier de controle, exige re-prova (§C4.3) |
| **V2 Authentication** | não | Nenhuma mudança em auth; as 2 páginas são anônimas por desenho |
| **V3 Session Management** | não | Nenhuma mudança de sessão |
| **V4 Access Control** | **sim — a categoria central da fase** | Guard `IS DISTINCT FROM` + re-imposição do escopo por vaga no corpo da RPC; `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated` |
| **V5 Input Validation** | sim | `p_candidatura_id uuid` — tipagem do Postgres; a RPC não aceita texto livre |
| **V6 Cryptography** | não | Nenhuma primitiva criptográfica é autorada |
| **V7 Error Handling / Logging** | sim | SQLSTATE cru nunca ecoado à tela (idioma de `RetencaoError`); auditoria via `log_auditoria` na mesma transação |
| **V8 Data Protection** | **sim** | Projeção nomeada, jamais `'*'` (`[[reference_select_star_leaks_pii]]`); nenhum UUID em superfície; `maskPII` descrito só até onde de fato mascara |
| **V12 Files & Resources** | não | Nenhum upload, nenhum Storage |
| **V13 API** | sim | A RPC é exposta via PostgREST a `authenticated` — daí o guard de papel ser obrigatório (§C4.4) |

### Known Threat Patterns for este stack

| Padrão | STRIDE | Mitigação padrão |
|---|---|---|
| **Guard NULL-cego em `SECURITY DEFINER`** (`NOT IN` com claim ausente falha ABERTO) | Elevation of Privilege | `IS DISTINCT FROM` — defeito real medido na 42-06, 61 funções afetadas |
| **DEFINER bypassando RLS e apagando escopo por linha** | Information Disclosure | Re-impor o predicado no corpo (§C4.5) — é o vazamento horizontal que a P32 fechou |
| **Star projection vazando PII** (RLS é row-level, não esconde coluna) | Information Disclosure | `HISTORICO_ALLOWLIST` explícita; a RPC devolve rótulo, nunca a linha de `usuarios_rh` |
| **RPC nova chamável por papel não previsto** (`GRANT ... TO authenticated` inclui candidatos) | Information Disclosure | Guard de papel no corpo (§C4.4) |
| **Nome de tabela / SQLSTATE / UUID em superfície pública** | Information Disclosure | Invariante 11 + ban de `data_deletion_log`/`delete_candidate_data` na copy pública |
| **Markdown renderizado em runtime numa página pública** | Injection (XSS) | Recusado pela UI-SPEC: copy é constante tipada, nunca markdown em runtime |
| **`DROP` silencioso de objeto com escritor vivo** | Denial of Service (silencioso) | Religar → provar por smoke → só então `DROP`; ou adotar (§C1.5) |
| **Vazamento de exercício de direito ao recrutador** | Information Disclosure (privacidade) | Invariante 10 / `D-47-U09` — o resíduo é aceito e escrito, não corrigido por um 5º rótulo |

---

## Sources

### Primary (HIGH confidence) — arquivos abertos com `Read`/leitura direta nesta sessão

- `supabase/migrations/20260607000001_historico_candidatura.sql` — a FK de `ator` (linha 43) e a
  advertência contra confundir com `historico_acoes` (linhas 14-19)
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:55-82` — a policy
  `candidato_le_proprio_historico`, viva
- `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql` — o `rh_le_historico`
  vaga-scoped e a nota "DEFINER bypasses row RLS"
- `supabase/migrations/20260609000001_prompt_library_schema.sql:311-334` — DDL, índice, policy e
  `COMMENT` de `data_deletion_log`
- `supabase/migrations/20260609000002_prompt_library_rpcs.sql:184-241` — o escritor vivo
- `supabase/migrations/20260801000002_p43_config_retencao.sql` — DDL da matriz, seed de 8,
  `listar_matriz_retencao`, `salvar_janela_retencao`, o guard `IS DISTINCT FROM` e o `PERFORM
  log_auditoria`
- `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:460-485, 925-945` — a severação de
  `ator` e o `COMMENT` que endereça o efeito colateral à `W-1/CONSOL-02` da Phase 47
- `supabase/migrations/20260713000003_usr_rh_mutacao_rpc.sql:37-39` — assinatura de `log_auditoria`
- `src/features/hub-candidato/services/historicoCandidaturaService.ts` — arquivo inteiro
- `src/features/hub-candidato/components/HistoricoBlock.tsx` — arquivo inteiro
- `src/features/triagem/services/triagemService.ts:386-409` — `ETAPA_M2_LABELS` / `ETAPA_M2_OPTIONS`
- `src/features/admin/retencao/components/EditarJanelaDialog.tsx:76-104, 273-302` —
  `DIALOGO_JANELA_COPY` e o `AlertDialog`
- `src/features/admin/retencao/services/retencaoService.ts:1-80`
- `src/__tests__/copyPortoesLgpd.test.ts:1-90` — os 4 idiomas do molde
- `src/router/routes.tsx:129-149` — a seção `ROTAS PÚBLICAS`
- `src/features/privacidade/constants/encarregado.ts:23`
- `docs/compliance/sql/gen-recibo-exclusao.cjs:1-120, 195-235, 1085-1135`
- `docs/compliance/pii-inventory.yaml:443-449` · `export-scope-rules.yaml:258-275` ·
  `catalogo-vivo-44.json:1-25, 1825-1858` · `backup-posture.md:80-92`
- `supabase/functions/_shared/pii-masker.ts:38-54` — as 7 classes de regex
- `supabase/functions/_shared/ai-client.ts` — providers e o fallback vivo
- `src/features/cadastro/services/viaCepService.ts:19`
- `database.types.ts` — `usuarios_rh`, `candidatos`, `candidaturas`, `historico_candidatura`,
  `logs_auditoria`, `categoria_log_auditoria:5527-5537`, `severidade_log:5580`
- `.husky/pre-commit` (arquivo inteiro) · `.github/workflows/ci.yml` (arquivo inteiro) ·
  `package.json` scripts · `.planning/config.json`
- `.planning/REQUIREMENTS.md:132-140, 197, 228-233, 256-257`
- `.planning/STATE.md:550-562, 745-756`
- `.planning/milestones/v7.0-phases/{36..41}` — listagem de diretórios + frontmatter dos 4
  `VALIDATION.md`
- `.planning/phases/45-motor-de-exclus-o-anonimiza-o/45-VALIDATION.md:1-40`

### Secondary (MEDIUM confidence) — execução de comando nesta sessão

- `npm run test:run` → 1696/1696, 174 arquivos
- `npm run -s lint | grep -c "error TS"` → 97
- `npm run -s check:export-allowlist` → OK · `npm run -s check:recibo-exclusao` → OK
- `dig`, `command -v supabase`, checagem de `SUPABASE_ACCESS_TOKEN` → medição negativa da região

### Tertiary (LOW confidence)

- Nenhuma consulta a documentação externa ou busca web foi feita nesta pesquisa. **Consequência
  deliberada:** os países dos subprocessadores (§C3.2) permanecem `[ASSUMED]` em vez de receberem um
  verniz de fonte externa. O fato que a fase precisa não é "onde a empresa tem sede" (achável na web)
  mas "onde o dado deste projeto é tratado" (achável só na conta do provedor). Substituir o segundo
  pelo primeiro seria produzir exatamente a declaração pública falsa que a Invariante 5 proíbe.

---

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH — zero pacote novo; toda ferramenta verificada em `package.json` ou por
  execução
- **Arquitetura (CONSOL-02):** HIGH — a chave de junção, o `::text`, o escopo por vaga e o guard de
  papel foram lidos nas migrations de origem, não inferidos
- **Arquitetura (CONSOL-03):** HIGH — os 12 sítios vieram de varredura repo-wide e cada um foi aberto
- **Arquitetura (TRANSP-02):** HIGH no molde e nos dois buracos; MEDIUM na forma da fonte (Open Q3)
- **Subprocessadores (TRANSP-01):** HIGH nas 6 entradas (todas medidas em código); **LOW no `país`** —
  não medível deste ambiente, e é o campo bloqueante
- **Pitfalls:** HIGH — 7 dos 10 têm precedente de defeito real registrado neste repositório
- **CONSOL-01 / CONSOL-04:** HIGH no inventário e no molde; MEDIUM na forma final do checklist

**Research date:** 2026-08-09
**Valid until:** 2026-09-08 (30 dias — stack estável, zero dependência nova). ⚠ **Duas medições
expiram antes:** o estado vivo de `config_retencao_etapa` e a contagem de `data_deletion_log`
dependem de PROD e devem ser re-medidas no início da execução, não reaproveitadas desta data.
