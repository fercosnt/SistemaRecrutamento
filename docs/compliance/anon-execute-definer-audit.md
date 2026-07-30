# Auditoria: `anon` com EXECUTE em funções `SECURITY DEFINER` de `public`

**Levantado:** 2026-07-30 · **Fase de origem:** 42 (achado incidental do plano 42-06/42-07)
**Medido contra:** catálogo vivo de PROD (`pg_proc`, `pg_default_acl`, `has_function_privilege`) — nunca contra arquivos de migration
**Status:** triagem completa · **correção NÃO feita** (decisão do operador: corrigir em fase própria)

---

## A causa raiz, em uma frase

`pg_default_acl` do schema `public` (dono `postgres`, objtype `f`) carrega
`{postgres=X, anon=X, authenticated=X, service_role=X}` — então **todo `CREATE FUNCTION` em
`public` nasce com EXECUTE concedido a `anon` como grant DIRETO E NOMEADO**. O idioma usado em
quase toda migration deste repositório é `REVOKE ALL ON FUNCTION … FROM PUBLIC`, que remove um
grant de `PUBLIC` **que nunca existiu** e deixa `anon=X` de pé.

Só duas migrations na história do repo revogam de `anon` nominalmente:
`20260727000001` (P41, `ler_resend_webhook_secret`) e `20260730000002` (Phase 42, os 3 RPCs do
Art. 20). Todo o resto do catálogo herdou o grant.

**Por que isso importa mais em `SECURITY DEFINER`:** DEFINER **bypassa RLS**. Numa função
`INVOKER`, um `anon` com EXECUTE ainda bate na RLS da tabela. Numa DEFINER, o único controle é o
guard escrito dentro do corpo — e a segunda metade deste achado é que o idioma de guard desta base
**falha aberto**.

## A segunda causa: o guard idiomático é NULL-cego

A forma predominante é:

```sql
IF v_role NOT IN ('rh', 'administrador') THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;
```

Com `v_role` NULL — chamador **sem JWT algum**, que é exatamente o caso `anon` — `NULL NOT IN (…)`
avalia **NULL** sob lógica de três valores, e um `IF` com condição NULL **não é tomado**. O guard só
recusa claim *presente-e-errada*; claim **ausente** passa. A forma correta é
`coalesce(v_role,'') NOT IN (…)`, mais rejeição explícita de `auth.uid() IS NULL`.

Provado e corrigido nos 3 RPCs do Art. 20 na migration `20260730000002`. **O resto do catálogo não
foi corrigido.**

---

## Números

| Métrica | Valor |
|---|---|
| Funções `SECURITY DEFINER` em `public` com EXECUTE p/ `anon` | **61** |
| Delas, chamáveis via PostgREST (excluídas as de trigger) | **39** |
| Sem referência a guard algum (`auth.uid`/`auth.jwt`/`app_metadata`/`is_active_rh`) | **16** |
| Com o idioma NULL-cego provável (regex: `NOT IN ('rh'…` sem `coalesce`) | **12** |
| Com guard usando `coalesce` | 2 |

> ⚠ As colunas "sem guard" e "NULL-cego" são **heurística de regex sobre `prosrc`**, não veredito.
> A classificação abaixo separa o que foi **verificado por execução/leitura de corpo** do que
> permanece **inconclusivo**.

---

## CONFIRMADO — sem guard algum, verificado lendo o corpo INTEIRO

Estas três não têm nenhuma verificação de autorização. Não é "guard fraco": não existe guard.

| Função | Efeito colateral se chamada por `anon` | Como foi confirmado |
|---|---|---|
| `varrer_retry_notificacoes()` | Lê `project_url` + `edge_invoke_key` do Vault e faz `net.http_post` para até **20** notificações por chamada → **disparo de e-mail** com as credenciais do projeto | corpo lido: vai direto ao Vault e ao loop, zero guard |
| `testar_webhook(uuid)` | Com um `webhook_config_id` **válido**, dispara o webhook configurado | corpo lido: vai direto ao `SELECT … FROM webhooks_config`; probe como `anon` retornou o JSON `not found` em vez de `42501` |
| `limpar_logs_antigos()` | `DELETE FROM logs_auditoria` (retenção default **730 dias**, exclui severidade `info`/`aviso` e categorias fora de `usuario`/`seguranca`) e grava linha de auditoria da limpeza | corpo lido + **executado como `anon` no probe: completou** |

**Nota de honestidade sobre o probe de `limpar_logs_antigos`:** ele foi executado de fato, como
`anon`, durante esta auditoria. Deletou **0 linhas** (log mais antigo = 2025-11-04, nada elegível
sob 730 dias), mas **inseriu** uma linha de auditoria registrando "Limpeza automática de logs: 0
logs deletados". Essa linha (`419b38e6-…`) foi **removida** ao fim, e `logs_auditoria` voltou a 4
linhas com zero registro de limpeza. Nenhum dado real foi perdido — mas o experimento provou o
ponto: a função é acionável sem autenticação e escreve na trilha de auditoria.

`varrer_retry_notificacoes` é fechada pela migration `20260730000003` do plano 42-07 (revoke
nominal de `anon`). **As outras duas seguem abertas.**

## CONFIRMADO — guard íntegro

| Função | Evidência |
|---|---|
| `publish_vaga(uuid)` | probe como `anon` → `42501 / forbidden`. Autorização dentro do corpo do DEFINER, antes de qualquer efeito |

## INCONCLUSIVO — exige revisão de ordem do corpo, função a função

Nestas o probe como `anon` alcançou um **lookup de linha** e voltou `P0002 (not found)`. Isso prova
que a execução passou do início do corpo, **mas não prova que o guard de papel falharia** — nestas
funções o lookup da linha corre *antes* do check de papel, então `P0002` é ambíguo por construção.

**Deliberadamente NÃO sondadas com IDs reais:** fazê-lo arriscaria gravar decisão em candidato
real, alterar avaliação, ou disparar notificação. A prova correta é leitura de corpo, não
experimento em PROD.

| Função | Por que importa |
|---|---|
| `registrar_decisao(uuid, decisao_final_resultado, text)` | grava **decisão final** sobre candidato; dispara os triggers de notificação → e-mail ao candidato. Toca RNF-07a / D-15 |
| `salvar_revisao_redacao(uuid, text, text, jsonb)` | grava revisão humana de redação |
| `salvar_avaliacao_entrevista(uuid, jsonb, text)` | grava scores humanos de entrevista |
| `confirmar_revisao_entrevista(uuid)` | confirma revisão de análise de entrevista |
| `reprocessar_analise(uuid)` | **dispara `net.http_post`** (re-análise por LLM) → custo |
| `promote_to_canary` · `promote_canary_to_active` · `rollback_to_version` | versionamento de prompt de LLM em produção |
| `save_entrevista_guia_edits` · `upsert_pergunta_opcoes_metadata` | conteúdo de avaliação |

## Provavelmente `anon` POR DESENHO — confirmar intenção, não presumir defeito

CLAUDE.md diz explicitamente "Duplicate check via RPC SECURITY DEFINER (nao anon SELECT)", o que
torna `check_candidato_duplicate` **deliberadamente** alcançável por `anon`. Por analogia, o fluxo
público de cadastro/avaliação provavelmente exige as demais:

`check_candidato_duplicate` · `submit_candidatura_atomic` · `get_bigfive_itens` ·
`get_cognitivo_itens` · `get_opcoes_sjt` · `get_configuracoes` · `pontuar_sjt` ·
`pontuar_cognitivo` · `calcular_scores_bigfive` · `calcular_scores_disc` ·
`calcular_scores_raven` · `registrar_acao_historico` · `log_auditoria` ·
`obter_detalhes_entrevista` · `validar_referencia_entrevista`

⚠ "Por desenho" **não** é o mesmo que "seguro". Várias destas escrevem. A fase de correção precisa
decidir, para cada uma, se o chamador correto é `anon` (candidato não-logado) ou `authenticated`
(candidato logado) — o cadastro público é anônimo, mas responder uma avaliação não deveria ser.

---

## O que a fase de correção precisa fazer

1. **Revisar ordem do corpo** das 12 inconclusivas e classificar cada guard como íntegro ou
   NULL-cego. Leitura de corpo, não probe em PROD.
2. **Migration corretiva** com `coalesce(role,'')` + rejeição de `auth.uid() IS NULL` nas que
   falharem aberto, e `REVOKE ALL ON FUNCTION … FROM anon` em tudo que não seja `anon` por desenho.
3. **Decidir `anon` vs `authenticated`** para cada função do fluxo público que **escreve**.
4. **Gate durável contra recorrência** — é a parte que impede o achado de voltar. Duas opções:
   - `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;` (fecha na
     origem; toda função nova nasce sem o grant e precisa de GRANT explícito), ou
   - asserção de catálogo em CI que reprova qualquer `SECURITY DEFINER` nova com `anon` EXECUTE
     não-allowlistada.
   A primeira é preferível: elimina a classe, em vez de detectá-la depois.
5. **Asserção de fail-closed por função corrigida** — o padrão da asserção (i) do
   `p42_revisao_art20_smoke.sql`: papel `authenticated` **sem claim** tem de receber 42501. Um gate
   que só testa o caminho autenticado não detecta um guard que falha aberto; foi exatamente essa
   lacuna que deixou o defeito do Art. 20 passar.

## Precedente que este achado estabelece

A P41 já sabia revogar de `anon` nominalmente (`ler_resend_webhook_secret`), e a 42-06 regrediu
contra esse padrão vivo. Conhecimento correto existindo em **uma** migration não impede a
recorrência — só um gate impede. É o mesmo formato do débito
`processo-origem-do-drift-desconhecida`: sem gate, o mesmo erro volta.
