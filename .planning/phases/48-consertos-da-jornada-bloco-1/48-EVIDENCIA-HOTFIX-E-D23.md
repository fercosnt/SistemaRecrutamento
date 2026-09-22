---
phase: 48-consertos-da-jornada-bloco-1
artefato: evidência para a verificação da fase (pedido do operador, 2026-09-22)
medido_em: 2026-09-22
via: MCP do Supabase, só leitura (toda SQL com SET TRANSACTION READ ONLY); repositório e git
---

# 48 — Evidência: o hotfix de segurança fora do plano, e o D-23 como implementado

Dois pedidos do operador para a verificação da Phase 48. Tudo abaixo foi **medido**. O que for
inferência está marcado como tal.

---

## (1) Hotfix de segurança FORA DO PLANO: leitura anônima de `candidaturas` e de 7 views

### O que é e por que está aqui

Não fazia parte de nenhum requisito da Phase 48. O achado surgiu durante o 48-14: com a chave
pública, que está no bundle, um `GET /rest/v1/candidaturas` devolveu dados. O conserto foi aprovado
pelo operador e aplicado pelo orquestrador em 2026-09-21, em duas migrations:

| Migration | O que faz | md5 ledger = arquivo |
|---|---|---|
| `20260921000016_fecha_leitura_anonima_candidaturas.sql` | `DROP POLICY "Allow anonymous duplicate check"` (era `FOR SELECT TO anon USING (true)`) + `REVOKE ALL ON public.candidaturas FROM anon` (o anon tinha SELECT nas 40 de 40 colunas) | `403cb55e…` |
| `20260921000017_fecha_views_legado_pii.sql` | `security_invoker = true` + `REVOKE ALL FROM anon, authenticated` nas 7 views legado | `c959c1d6…` |

**O que estava exposto a qualquer pessoa com a chave pública,** medido com `SET LOCAL ROLE anon`
antes do conserto:
- `candidaturas`: todas as linhas e todas as colunas, incluindo `motivo_rejeicao`, `observacoes_rh`, `analise_ia_*` e `curriculo_url`;
- `v_candidatos_ativos`: 42 linhas com CPF, e-mail, celular, nascimento e endereço;
- `v_ultimos_acessos`: 43 linhas;
- `v_usuarios_rh_ativos`: 7 linhas;
- `v_sessoes_ativas_validas`: 0 linhas, mas expunha `session_token`;
- `security_analysis_view`: 6 linhas;
- `v_estatisticas_webhooks`: 3 linhas;
- `v_biblioteca_mais_usadas`: 0 linhas.

As views valiam também para qualquer `authenticated`.

**Depois do conserto:** `permission denied` para `anon` nos 8 objetos. `authenticated` e as outras 6
policies de `candidaturas` ficaram idênticas à linha de base. O RLS de `candidaturas` está ligado.

### Desde quando a exposição esteve aberta (o dado que o operador pediu)

**Nenhum dos 8 objetos tem migration de origem no repositório.** Foram criados fora da cadeia de
migrations, antes de ela existir. O ledger de PROD (`supabase_migrations.schema_migrations`) tem 192
linhas, de `20260419000000` a `20260921000017`. A baseline `20260419000000` é um arquivo vazio que
declara que o esquema base foi montado fora da cadeia, e as linhas de ledger de 2025 não existem
mais. O nome da policy e o das views só aparecem nas próprias `…016` e `…017`.

**Método de datação sem migration.** `track_commit_timestamp` está desligado, então não há carimbo
de commit. O relógio usado foi o id de transação: o PG 17.6 preserva o `xmin` depois do freeze, e o
banco tem cerca de 44 mil transações, sem wraparound. Usei o `xmin` de `pg_type` e de `pg_rewrite`,
que o hotfix de 21/09 não reescreveu (ele reescreveu só `pg_class`). O xid foi convertido em data com
linhas que só recebem INSERT e carregam hora: criação do projeto (xid 1208 = 24/10/2025 22:38),
buckets de storage (1268 = 02/11 19:27, 1356 = 03/11 11:26), `logs_auditoria` (1461/1480 = 04/11
11:08/12:28), `realtime` e `auth` (1560 = 12/11 12:54; 1812/1831 = 18/11 22:13 e 21/11 22:45).

| Objeto | Criado em (medido) | Exposição aberta | Confiança |
|---|---|---|---|
| `v_candidatos_ativos`, `v_usuarios_rh_ativos`, `v_sessoes_ativas_validas`, `v_ultimos_acessos` | xmin 1266 → **até 02/11/2025 19:27** (script `docs/sql/sql/09-views.sql`, «Data: 2025-11-02») | **02/11/2025 → 21/09/2026** (~10,5 meses) | alta |
| `v_estatisticas_webhooks`, `v_biblioteca_mais_usadas` | xmin 1471 → **04/11/2025, 11:08–12:28** (`docs/sql/sql/27-views-configuracoes.sql`) | **04/11/2025 → 21/09/2026** | alta |
| `security_analysis_view` | xmin 1819 → **18/11/2025 22:13 a 21/11/2025 22:45** | **~20/11/2025 → 21/09/2026** | alta |
| SELECT de `anon` na tabela `candidaturas` (privilégio) | tabela criada no xid 1293, **entre 02/11 19:27 e 03/11 11:26/2025**; o anon recebeu tudo pelo `pg_default_acl` do schema `public`; nenhum GRANT/REVOKE de anon na tabela antes da `…016` | desde a criação da tabela | alta |
| **Policy `"Allow anonymous duplicate check"`** | **Não medida.** O `DROP` de 21/09 apagou a linha do catálogo e ela não aparece em nenhum SQL do git (dois repositórios). Não pode ser anterior à tabela (xid 1293). Prova documental mais antiga: `docs/RLS_POLICIES.md`, «Last Updated: 2025-11-13», que a lista | **no máximo desde 13/11/2025 → 21/09/2026** (~10 meses) | média |

**Inferido, não provado:** a policy gêmea em `candidatos` (`"Allow anonymous SELECT for duplicate
check"`, ainda viva, inerte porque o anon não tem privilégio na tabela) tem xmin 1520. Isso a situa
entre 07/11 16:50 e 12/11 12:54/2025. A de `candidaturas` provavelmente nasceu na mesma sessão.

**A exposição foi contínua?**
- **Views:** o xmin de `pg_type` e `pg_rewrite` nunca mudou, então elas nunca foram recriadas nem
  redefinidas. Nenhuma migration nem SQL no git mexe nos grants delas antes da `…017`.
- **Policy:** o catálogo não prova continuidade, porque de nov/2025 a abr/2026 não há ledger e houve
  apply fora do versionamento em 2026-07. Duas evidências apontam para continuidade:
  - `docs/RLS_POLICIES.md` a lista, e entrou no git em 19/04/2026;
  - a migration `20260709000002_sec08_candidaturas_dup_policy_remediation.sql` (Phase 24, 09/07/2026) a cita **pelo nome, como invariante**: «the anon duplicate-check policy [is] untouched».

⚠ **Fato relevante para a decisão sobre comunicação.** Em **09/07/2026** a policy anônima foi vista
numa revisão de segurança (SEC-08) e deliberadamente mantida, sem ser avaliada como vazamento. A
exposição era conhecida no repositório pelo nome desde 19/04/2026 e foi reafirmada em 09/07/2026. Só
foi reconhecida como vazamento em 21/09/2026, no 48-14.

**Acesso de terceiros:** os logs da API só alcançam cerca de 48 h. Nesse intervalo não houve leitura
anônima externa de `candidaturas`: as leituras sem JWT foram das nossas Edge Functions ou da sonda do
48-14. As 7 views não receberam nenhuma requisição. **Antes de 48 h não há log**, então não é possível
afirmar nem descartar acesso de terceiros entre nov/2025 e 19/09/2026.

**Linhas que existem hoje em `candidaturas`, por mês de criação:** 8 com carimbo 2024-02-22 (fixture),
3 de 2025-11 e 27 de 2026-04 a 2026-09. Linhas apagadas antes de hoje não são visíveis.

> **A avaliação de incidente (LGPD Art. 48) e a decisão de comunicar são do operador e do
> Encarregado.** Este documento só mede.

**Pendências que o hotfix não fechou** (em `deferred-items.md` §48-14):
- varredura de funções `SECURITY DEFINER` executáveis por `anon` que devolvam PII (não feita);
- `rejeitar_candidatura`, `funil_kpis` e `registrar_decisao` concedem EXECUTE a `anon`. Os guards de corpo fecham o acesso, mas o ACL é o do `pg_default_acl`.

---

## (2) D-23 como implementado, contra a decisão do operador

**A decisão** (`48-CONTEXT.md:67`): «Quem teve a decisão revertida não registra a nova decisão
daquele caso (JORN-19). Bloqueio duro, server-side […]: depois de uma reabertura, `registrar_decisao`
recusa o `por_usuario` da decisão revertida. **Qualquer outro RH/admin decide.**»

**A função viva em PROD** (`pg_get_functiondef`, 2026-09-22): `registrar_decisao(uuid,
decisao_final_resultado, text)`, SECURITY DEFINER, `search_path` vazio. O passo (2b):

```sql
IF EXISTS (SELECT 1 FROM public.decisao_final d
            WHERE d.candidatura_id = p_candidatura_id
              AND d.revisao_veredito = 'revertida' AND d.decisao = 'rejeitado'
              AND d.por_usuario = v_uid)
   OR EXISTS (SELECT 1 FROM public.decisao_final_historico h
               WHERE h.candidatura_id = p_candidatura_id
                 AND h.revisao_veredito = 'revertida' AND h.decisao = 'rejeitado'
                 AND h.por_usuario = v_uid) THEN
  RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
    USING ERRCODE = '42501';
END IF;
```

| O que a decisão diz | O que o código faz | Veredito |
|---|---|---|
| «quem teve a decisão revertida» | recusa o `por_usuario` da linha `revertida` + `rejeitado`, na linha vigente **e** no arquivo | ✓ igual |
| «não registra a nova decisão» | recusa para qualquer `p_decisao` (aprovado, rejeitado, em_espera) | ✓ igual (bloqueio duro) |
| «daquele caso» | filtro por `candidatura_id = p_candidatura_id`; nas outras candidaturas a mesma pessoa decide normalmente | ✓ igual |
| «qualquer outro RH/admin decide» | o D-23 só bloqueia o decisor revertido. O revisor não é bloqueado. `decisao = 'rejeitado'` impede que um terceiro que registrou `em_espera` na reabertura fique travado | ✓ no que o D-23 acrescenta. **Ver a nuance abaixo** |
| server-side | na RPC SECURITY DEFINER; a tela (48-15) só traduz o erro | ✓ |

**Provado ao vivo na sessão 2** (candidatura `2ce20fbf-…` da `+claude1`): o decisor revertido
`4fceff36-…` foi recusado na tela com a mensagem D-23. O revisor foi `66412f96-…`, e quem aprovou,
`023abcd6-…`, pôde decidir. Três pessoas distintas.

### ⚠ Nuance: «qualquer outro RH» depende de uma trava ANTERIOR ao D-23

A mesma função tem, **desde a Phase 15** (`20260625100001_decisao_final_phase15.sql`), a trava de
dono da vaga (passo 2):

```sql
IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
END IF;
```

O JWT mapeia `usuarios_rh.role = 'recrutador'` para `'rh'` e `'administrador'` para `'administrador'`
(`custom_access_token_hook`). Na prática:
- **administrador:** qualquer outro administrador redecide o caso. É exatamente a decisão.
- **recrutador (`rh`):** só redecide se for o **criador da vaga**. Um recrutador que não criou a vaga já era recusado antes do D-23, e continua sendo.

**Hoje isso não tem efeito:** `usuarios_rh` tem **3 administradores ativos e 0 recrutadores ativos**,
e as 3 contas da sessão 2 são administradores. Então hoje «qualquer outro RH» = «qualquer outro
administrador», e o D-23 vale exatamente como decidido.

**O que muda quando existir recrutador:** se a vaga for de um recrutador R e a decisão revertida for
do próprio R, só um administrador redecide. Outro recrutador não redecide, pela regra de dono da
vaga, não pelo D-23. Não há impasse enquanto houver administrador ativo.

> Se «qualquer outro RH» deve incluir recrutadores que não criaram a vaga **nos casos reabertos**,
> é uma decisão nova do operador, que muda a regra de dono da vaga, não o D-23. A execução não mexeu
> nisso.
