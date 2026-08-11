---
phase: 45-motor-de-exclus-o-anonimiza-o
reviewed: 2026-08-11T00:00:00Z
depth: deep
scope: motor destrutivo da Phase 45 (7 migrations + Edge Function), ANTES do primeiro apply
files_reviewed: 10
files_reviewed_list:
  - supabase/migrations/20260805000003_p45_bias_k5.sql
  - supabase/migrations/20260805000004_p45_sever_user_id.sql
  - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql
  - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
  - supabase/migrations/20260805000007_p45_retirada_e_evento.sql
  - supabase/migrations/20260805000008_p45_v_triagem_panel_encerramento.sql
  - supabase/migrations/20260805000009_p45_claims_do_titular.sql
  - supabase/functions/executar-direito-titular/index.ts
  - supabase/functions/executar-direito-titular/helpers.ts
  - src/features/privacidade/services/exclusaoService.ts
findings:
  critical: 6
  warning: 9
  info: 0
  total: 15
status: issues_found
gate_verdict: REPROVADO — 6 blockers abertos. O portão destrutivo NÃO abre.
---

# Phase 45 — Code Review BLOQUEANTE do motor destrutivo

**Reviewed:** 2026-08-11
**Depth:** deep (cross-file: migrations ↔ Edge Function ↔ catálogo vivo ↔ frontend)
**Status:** `issues_found` — **6 BLOCKER**, 9 WARNING
**Veredito do portão (item 2 dos 5):** **REPROVADO.** Blocker aberto = portão fechado. Nenhum
`apply_migration` de `20260805000004`, `000005`, `000006` ou `000009` deve acontecer antes de
CR-01…CR-06 estarem fechados ou explicitamente aceitos por decisão datada do operador.

---

## Sumário

O motor foi lido inteiro, nos dois lados (SQL e Deno), com o catálogo real conferido por leitura
das migrations de origem de cada tabela citada. **A metade Postgres é de qualidade alta**: o guard
é NULL-safe nas três comparações, a ordenação faixa-etária→sentinela está provada por execução, o
scrub de `decisao_final_historico` está corretamente DEPOIS do `decisao_final`, os dois `inet` são
truncados de verdade, e as 3 FKs `NO ACTION` não são tocadas por migration nenhuma da fase (§
"Guards conferidos e CORRETOS" abaixo, que é a metade do relatório que o portão também precisa).

**O que reprova está concentrado em três lugares, e os três produzem exatamente o desfecho que a
fase existe para não produzir:**

1. **A extensão de papel do 45-12 (migration `000009`) converte o tombstone numa RPC de navegador.**
   O `GRANT EXECUTE ... TO authenticated` torna `anonimizar_candidato(uuid, boolean)` chamável
   diretamente por PostgREST. O guard do corpo verifica **identidade**, nunca **intenção**: ele não
   sabe se o passo 1 rodou, se existe pedido, se a janela venceu. Um titular — ou qualquer `rh` —
   apaga PII irreversivelmente com uma chamada, fora do motor, sem recibo e sem trilha.
2. **O passo 1 (Storage) não é idempotente e falha PARA SEMPRE numa condição que o próprio código
   antecipa** (`ponteiro_morto`). Um único ponteiro morto apaga os CVs reais e depois trava a
   execução em definitivo: currículo apagado + PII intacta, irrecuperável.
3. **Não existe retomada depois do passo 2.** O `403` que o docblock declara "desejado" torna os
   passos 3 e 4 inalcançáveis: conta do Auth viva, e-mail do titular vivo em `auth.users`, recibo
   nunca enviado, `situacao='executando'` para sempre — sem cron, sem caminho de operador.

Somados, CR-02/CR-03/CR-05 significam que **as três rotas de falha mais prováveis do motor
convergem no mesmo estado terminal**: currículo destruído, pessoa não apagada, nada retomável.

---

## BLOCKERS

### CR-01 · O `GRANT` do 45-12 transforma o tombstone numa RPC de navegador — fora do motor, fora da janela, fora do recibo

**Arquivos:**
`supabase/migrations/20260805000009_p45_claims_do_titular.sql:143-144`
`supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:240-275` (o guard) e `:509-514`
`supabase/functions/executar-direito-titular/index.ts:1139-1142` (o terceiro client)

**Issue.** A migration `000009` executa:

```sql
REVOKE ALL ON FUNCTION public.anonimizar_candidato(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO authenticated;
```

Antes disso, a função era `service_role`-only (`000006:548-550`) e a **Edge Function era a única
porta**. A EF é quem impõe: (a) que exista um `solicitacoes_dados` do tipo `exclusao`; (b) que a
janela de arrependimento tenha vencido (`index.ts:627-639`); (c) que o **passo 1 de Storage já
tenha carimbado** antes do Postgres; (d) que o recibo seja enviado; (e) que os carimbos existam.

O guard do corpo, que a migration `000009:68-79` declara ser "o único controle", verifica apenas
**quem chama**, nunca **em que estado o motor está**:

```sql
IF v_role IS DISTINCT FROM 'rh'
   AND v_role IS DISTINCT FROM 'administrador'
   AND v_dono IS DISTINCT FROM v_uid THEN  -- recusa
```

**Cenário concreto 1 (titular).** Titular `T` está logado em `/candidato/privacidade`. Do console do
navegador, com o client anon que a aplicação já usa em todo lugar:

```js
await supabase.rpc('anonimizar_candidato', { p_candidato_id: <o id dele>, p_dry_run: false })
```

`auth.uid()` = `T`, `v_dono` = `T` → o guard **aceita**. Resultado: o tombstone commita. PII
destruída **imediatamente**, sem os 15 dias do ERASE-06, sem `storage_concluido_em`, sem
`postgres_concluido_em`, sem recibo, e sem uma linha em `solicitacoes_dados` que registre que
aconteceu. E como `candidatos.user_id` acabou de virar NULL, **o passo 2 do handler da EF passa a
devolver 403 para sempre** (`index.ts:375-387`) — o CV do titular fica **órfão no bucket, sem
nenhum caminho que consiga enumerá-lo ou removê-lo**. A ordem `Storage → Postgres → Auth` foi
invertida por um caminho que o schema permite e que nenhum controle recusa. O modo de falha é,
literalmente, o "SILENCIOSO" que o `000005:81-87` descreve.

**Cenário concreto 2 (RH, pior).** Usuário com `app_metadata.role = 'rh'` chama a mesma RPC com o
`candidato_id` de **qualquer** candidato — o guard aceita `rh` incondicionalmente, sem exigir
titularidade nem pedido. Uma chamada destrói o nome, CPF, celular, data de nascimento e endereço
daquela pessoa, e o `000006:168-177` registra explicitamente que a função **não escreve em
`logs_auditoria`**. Não há recibo, não há pedido, não há autor registrado. É uma primitiva de
destruição de PII, sem trilha, exposta ao papel `rh`.

**Fix (mínimo, e ele também endurece a ordem no banco em vez de só na EF):** acrescentar ao corpo de
`anonimizar_candidato`, logo depois da metade (b) do guard, um **guard de INTENÇÃO** que exige o
estado que só o motor produz:

```sql
  -- (c) GUARD DE INTENCAO: o tombstone so roda dentro do motor, e so DEPOIS do Storage.
  --     E o que impede que o GRANT a `authenticated` (20260805000009) vire uma porta
  --     direta por PostgREST, fora da janela do ERASE-06 e fora da ordem do ERASE-03.
  IF NOT EXISTS (
    SELECT 1 FROM public.solicitacoes_dados s
     WHERE s.candidato_id = p_candidato_id
       AND s.tipo         = 'exclusao'
       AND s.situacao     = 'executando'
       AND s.executar_em <= now()
       AND s.storage_concluido_em IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: anonimizar_candidato so executa dentro do motor — exige pedido de exclusao em situacao=executando, janela vencida e storage_concluido_em carimbado. A ordem Storage -> Postgres -> Auth nao e imposta pela plataforma (SONDA 2) e passa a ser imposta AQUI'
      USING ERRCODE = '42501';
  END IF;
```

⚠ Esse guard tem de ficar **fora** do ramo de `p_dry_run` (senão o dry-run do 45-11 deixa de
poder rodar sobre uma linha arbitrária) — a saída limpa é aceitar o dry-run sem o guard de intenção
e exigi-lo apenas quando `p_dry_run = false`. Alternativa equivalente: **não conceder
`anonimizar_candidato` a `authenticated`** e fazer a EF chamá-la pelo `supabaseAdmin`, passando a
identidade do titular por parâmetro (`p_auth_uid`) que a função compara com o dono — o `GRANT` a
`authenticated` continua necessário só para as outras quatro.

---

### CR-02 · O passo 1 (Storage) não é idempotente e trava PERMANENTEMENTE numa condição que o próprio código antecipa — currículo apagado, PII intacta

**Arquivos:**
`supabase/functions/executar-direito-titular/index.ts:688-712`
`supabase/functions/executar-direito-titular/helpers.ts:172-215` (`ponteiro_morto`)

**Issue.** O laço do passo 1 apaga o lote inteiro e **depois** exige que TODO caminho do lote
apareça na resposta do `remove()`:

```ts
const { data, error } = await supabaseAdmin.storage.from(BUCKET_CURRICULOS).remove(lote);
if (error) throw new ErroDePasso("storage", "remove");
const apagados = new Set(/* nomes devolvidos por remove() */);
for (const c of lote) {
  if (!apagados.has(c)) throw new ErroDePasso("storage", "remove_divergente");
}
```

`remove()` devolve **os objetos que existiam e foram apagados**. Um caminho que não existe no
bucket simplesmente não volta na resposta. E `unirEDeduplicarCaminhos` **coloca deliberadamente
esses caminhos no lote**: `caminhos` é a UNIÃO de `list()` com `candidaturas.curriculo_url`, e o
próprio helper nomeia o caso — `ponteiro_morto`: *"uma linha o aponta e ele não existe no bucket"*.

**Cenário concreto 1 (primeira execução).** Titular com 2 CVs no bucket (`uid/a.pdf`, `uid/b.pdf`) e
uma candidatura antiga cujo `curriculo_url` aponta para `uid/c.pdf`, já removido por
`removeCV()` numa re-submissão anterior. `caminhos = [a, b, c]`. O `remove()` apaga **a e b de
verdade** e devolve `[a, b]`. O laço de conferência não acha `c` → `remove_divergente` →
`ErroDePasso("storage")`. **`storage_concluido_em` nunca é carimbado**, o passo 2 nunca roda.
Estado final: **os dois currículos reais destruídos e 100% da PII intacta no banco** — a definição
literal do pior desfecho da fase, com PITR desligado e Storage fora do backup.

**Cenário concreto 2 (a retomada é matematicamente impossível).** O titular tenta de novo. O plano
persistido tem os mesmos `caminhos`. `remove([a,b,c])` agora devolve `[]` — `a` e `b` já não
existem. `remove_divergente` outra vez. **Toda tentativa futura falha do mesmo jeito, para sempre.**
Isso vale também para o caso mais banal: uma falha de rede no meio do laço de lotes (ou no
`carimbar` da linha 711) deixa objetos apagados sem carimbo, e a re-execução nunca mais consegue
passar do passo 1.

O docblock afirma *"A idempotência é por ESTADO REGISTRADO no plano, jamais por try/catch"*
(`index.ts:573-576`) — mas o único estado registrado é `storage_concluido_em`, que só é escrito
**depois** de o laço inteiro passar. Não há estado por-caminho.

**Fix.** A conferência tem de distinguir "não apagou" de "não existia", e a retomada tem de
enxergar o que já sumiu. O caminho mais curto sem mudar o schema:

```ts
if (!estado.storage_concluido_em) {
  for (const lote of dividirEmLotes(caminhos, LIMITE_REMOCAO)) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_CURRICULOS).remove(lote);
    if (error) throw new ErroDePasso("storage", "remove");
    const apagados = new Set(/* … */);
    // ⚠ Ausente na resposta NAO e falha: e "ja nao existe". A conferencia honesta
    // e RE-ENUMERAR o prefixo e exigir que ele esteja VAZIO — o pos-estado, nunca
    // o retorno de uma chamada. Um caminho ausente pode ser ponteiro_morto (esperado,
    // helpers.ts:177) ou uma remocao anterior desta mesma execucao retomada.
    for (const c of lote) {
      if (!apagados.has(c)) naoDevolvidos.push(c);
    }
  }
  // A ASSERCAO CORRETA e sobre o POS-ESTADO do bucket, e ela e idempotente:
  const restantes = await enumerarObjetosTitular(supabaseAdmin, `${authUid}/`);
  if (restantes.length > 0) throw new ErroDePasso("storage", "residuo_apos_remove");
  await carimbar("storage", { storage_concluido_em: agora(), storage_nao_devolvidos: naoDevolvidos });
}
```

Isso mantém a falha FECHADA (resíduo no bucket reprova), remove o falso positivo do
`ponteiro_morto`, e torna a retomada convergente: numa segunda tentativa o bucket já está vazio e
o passo carimba. Os `naoDevolvidos` viram achado registrado, não parada.

---

### CR-03 · Não existe retomada depois do passo 2 — os passos 3 e 4 ficam INALCANÇÁVEIS, e a conta do Auth sobrevive para sempre

**Arquivos:**
`supabase/functions/executar-direito-titular/index.ts:375-387` (o `.eq("user_id", user.id)`)
`supabase/functions/executar-direito-titular/index.ts:578-584` (a limitação reconhecida)
`supabase/functions/executar-direito-titular/index.ts:747-779` (passo 3), `:791-811` (passo 4)

**Issue.** O handler resolve o titular por `candidatos.user_id = auth.uid()`. O passo 2
(`anonimizar_candidato`) severa `user_id` para NULL **e commita**. A partir daí **qualquer**
invocação daquele titular cai em `403` na linha 386, antes de `executarExclusao` sequer ser
chamada. O docblock reconhece isso (`:578-584`) e conclui *"a retomada por ESTE caminho só existe
ATÉ o fim do passo 2"* — mas não registra a consequência inteira: **não existe outro caminho.**
Confirmado por varredura: `acao: 'executar'` não tem chamador em `src/`, não há `cron.schedule`
apontando para a EF, e não há ação de operador.

**Cenário concreto.** O passo 2 commita às 03:14. Antes do `deleteUser`, a EF sofre timeout de
Deno / o `deleteUser` devolve erro / a rede cai. `catch` → `causa='falha_auth'` → 500. O titular
recarrega a tela e clica de novo: **403**. Estado terminal permanente:

| sistema | estado |
|---|---|
| Storage | currículos apagados, irrecuperáveis |
| Postgres | tombstone escrito; `situacao='executando'` para sempre; `auth_concluido_em` NULL |
| Auth | **conta viva, com o e-mail real do titular em `auth.users`** — PII não apagada |
| Recibo | **nunca enviado** — o passo 4 fica atrás do passo 3 no mesmo `try` |

A pessoa exerceu o Art. 18, VI, perdeu o currículo, e o identificador principal dela (o e-mail de
login) permanece. Ela pode até continuar logando — com 403 em toda tela de privacidade. Não há a
quem escalar dentro do produto.

**Fix.** A retomada precisa de um caminho que não dependa de `candidatos.user_id`. Duas peças, e a
primeira é obrigatória:

1. **Resolver o pedido pelo `auth.uid()` diretamente quando a ação é `executar`.** Persistir
   `auth_uid` numa coluna de `solicitacoes_dados` (o passo 0 já o coloca dentro do `plano`, mas o
   `plano` é esvaziado no passo 4) e, na ação `executar`, aceitar também:
   ```ts
   // Retomada pos-tombstone: `candidatos.user_id` ja e NULL por desenho (D-45-11), entao
   // a resolucao por titular NAO pode ser a unica. Um pedido em `executando` cujo
   // `auth_uid` bate o `auth.uid()` da sessao e o mesmo titular, provado pelo JWT.
   if (!cand?.id && acao === "executar") {
     const { data: p } = await supabaseAdmin.from("solicitacoes_dados")
       .select(COLUNAS_PEDIDO + ", candidato_id, auth_uid")
       .eq("auth_uid", user.id).eq("tipo", TIPO_EXCLUSAO)
       .eq("situacao", SITUACAO_EXECUTANDO).maybeSingle();
     if (p?.id) { /* segue para executarExclusao com p.candidato_id */ }
   }
   ```
2. **Um executor agendado** (`pg_cron` + `net.http_post`, ou uma EF de varredura com service_role)
   que retome pedidos em `situacao='executando'` com carimbos incompletos. Sem ele, mesmo o fix (1)
   depende de o titular voltar e clicar — ver WR-09.

---

### CR-04 · `candidaturas.curriculo_url` e `curriculo_nome_original` sobrevivem ao tombstone — o `auth.uid()` e o nome do arquivo ficam em claro

**Arquivos:**
`supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:335-368` (a lista de colunas do
tombstone — `candidaturas` não aparece em statement nenhum do corpo)
`src/features/vagas/services/cvUploadService.ts:99-131` (o esquema de caminho)
`supabase/functions/executar-direito-titular/index.ts:869-876`

**Issue.** O esquema de caminho é `{authUid}/{uuid}.pdf`, documentado em `cvUploadService.ts:101`.
Esse caminho é persistido em `candidaturas.curriculo_url`, e o nome original do arquivo em
`candidaturas.curriculo_nome_original`. **`anonimizar_candidato` não toca `candidaturas` em
nenhum statement.** As linhas de `candidaturas` são preservadas por desenho (ERASE-08, e está
certo) — mas essas duas colunas não são trilha de decisão, são PII e um ponteiro reverso.

**Cenário concreto de re-identificação.** Depois do tombstone e ANTES do `deleteUser` — que é
exatamente a janela do CR-03, que agora sabemos ser permanente:

```sql
SELECT u.email, u.id
  FROM public.candidaturas c
  JOIN auth.users u ON u.id::text = split_part(c.curriculo_url, '/', 1)
 WHERE c.candidato_id = '<o tombstone>';
```

devolve **a identidade completa do titular "anonimizado"**, por um join de uma linha. O
`severar_user_id` do passo 2 é desfeito por uma coluna de texto que ninguém severou. Isso é
pseudonimização apresentada como anonimização — precisamente o que o `000006:402-406` argumenta
não aceitar para `ai_call_logs`, aplicado com rigor menor aqui.

E mesmo **depois** do `deleteUser`: `curriculo_nome_original` costuma ser o arquivo escolhido pela
pessoa (`Curriculo_Joao_Silva_2026.pdf`). Ele fica legível para o RH no painel de triagem
(`20260623000001_v_triagem_panel_orderable.sql:24` seleciona a coluna) **numa linha cujo candidato
é um tombstone**. A busca de re-identificação da Task 3 do 45-11 (faixa + UF + vaga + timestamp)
não cobre esse vetor, porque ele não precisa de quase-identificadores: o nome está escrito.

**Fix.** Acrescentar ao corpo de `anonimizar_candidato`, no bloco `tombstone_candidato`:

```sql
  -- `candidaturas` NAO e apagada (ERASE-08) — mas estas DUAS colunas nao sao trilha de
  -- decisao: `curriculo_url` embute o `auth.uid()` em claro (esquema `{authUid}/{uuid}.pdf`,
  -- cvUploadService.ts:101) e resolve de volta ate `auth.users` por split_part; e
  -- `curriculo_nome_original` costuma carregar o NOME da pessoa no nome do arquivo, e e
  -- lido pelo painel de triagem do RH (v_triagem_panel).
  UPDATE public.candidaturas c
     SET curriculo_url           = NULL,
         curriculo_nome_original = NULL
   WHERE c.candidato_id = p_candidato_id;
  GET DIAGNOSTICS v_n_cvurl = ROW_COUNT;
```

⚠ **Ordem obrigatória:** este `UPDATE` tem de vir **depois** do passo 0 da EF (que lê
`curriculo_url` para montar o plano) — o que já é verdade, porque a EF só chama o tombstone no
passo 2. Conferir que as duas colunas são nuláveis antes de aplicar; se `curriculo_url` for
`NOT NULL`, usar sentinela `'[removido]'` em vez de NULL (o mesmo raciocínio do bloco (4) do
cabeçalho daquela migration). E acrescentar `v_n_cvurl` ao `RAISE` do dry-run e ao jsonb de
`passos`.

---

### CR-05 · «o motor trata 23503 como CLASSE» é uma garantia que NÃO EXISTE em código — o padrão P39/CR-02 repetido, num `COMMENT` que vai para o catálogo vivo

**Arquivos:**
`supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:229` e `:450` (a afirmação, dentro de
`jsonb` devolvido ao chamador **e** dentro do `COMMENT ON FUNCTION`)
`supabase/functions/executar-direito-titular/index.ts:771-778` (onde o tratamento deveria estar)

**Issue.** As duas afirmações são literais:

> `'o motor trata 23503 como CLASSE e nunca como constraint nomeada: duas contas reais deram dois bloqueadores DIFERENTES na SONDA 6 (…, preferencias_notificacoes.created_by na conta hibrida candidato+RH)'`

**Varredura do repositório inteiro: não existe nenhuma leitura de `23503`, nenhum
`foreign_key_violation`, nenhuma enumeração dinâmica de FKs bloqueadoras, em migration alguma da
fase nem na Edge Function.** O único tratamento é:

```ts
if (retornoDelete?.error) throw new ErroDePasso("auth", "delete_user");
```

— que trata 23503 exatamente como trata qualquer outro erro: `causa='falha_auth'`, 500, fim. Isso é
o mesmo defeito que a P39/CR-02 produziu (uma guarda documentada que era dead code), agravado por
o texto viver num `COMMENT` do catálogo — a próxima pessoa lê "o motor trata" como fato medido.

**Cenário concreto, e ele está NOMEADO na própria migration.** A conta híbrida candidato+RH que
existe em PROD tem linhas em `preferencias_notificacoes.created_by → auth.users` com `NO ACTION`.
O motor **não severa essa coluna** (ela não está entre as seis tabelas que `anonimizar_candidato`
toca). Sequência: passo 1 apaga o currículo → passo 2 escreve o tombstone → passo 3 `deleteUser` →
**23503** → `falha_auth`. E pelo CR-03 esse estado é **terminal**: currículo destruído, conta viva,
sem retomada. O `000005:229` sabe do bloqueador, o `45-11-PLAN.md:41` proíbe (corretamente)
relaxar a FK, e **nenhum dos dois transformou isso em código**.

**Fix — duas partes, e a segunda é a que fecha o resíduo indefinidamente:**

1. **Severar explicitamente o bloqueador medido**, dentro da mesma transação do tombstone
   (`000006`, no bloco `severar_fks_set_null`), do mesmo modo que `historico_candidatura.ator`:
   ```sql
   -- `preferencias_notificacoes.created_by` -> auth.users NO ACTION. Medido na SONDA 6
   -- como o bloqueador REAL do deleteUser na conta hibrida candidato+RH que existe em PROD.
   -- Sem isto o 23503 acontece DEPOIS do passo 1, e (CR-03) sem retomada.
   UPDATE public.preferencias_notificacoes p
      SET created_by = NULL
    WHERE v_user_id IS NOT NULL AND p.created_by = v_user_id;
   GET DIAGNOSTICS v_n_pref = ROW_COUNT;
   ```
   ⚠ Conferir `attnotnull` de `created_by` ANTES de aplicar — se for `NOT NULL`, o `UPDATE` aborta
   a transação inteira depois do Storage, que é o Pitfall 1.
2. **Fazer o plano ENUMERAR os bloqueadores em vez de afirmar que os trata.** Acrescentar a
   `plano_exclusao_titular` uma chave `bloqueadores_deleteuser` computada do catálogo, e fazer a EF
   **recusar o passo 1** se ela vier não-vazia:
   ```sql
   'bloqueadores_deleteuser', (
     SELECT coalesce(jsonb_agg(jsonb_build_object('tabela', x.tbl, 'coluna', x.col)), '[]'::jsonb)
       FROM public.fks_no_action_para_auth_users_com_linhas(v_user_id) x
   )
   ```
   Uma verificação **antes** da primeira mutação transforma o 23503 de "desfecho esperado" em
   "recusa barata" — que é a única forma de o 23503 não custar um currículo.

---

### CR-06 · A sentinela de idempotência é um campo escrito pelo usuário — quem tiver o e-mail certo nunca é anonimizado, e o recibo mente

**Arquivo:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:294` e `:296-309`

**Issue.** O marcador de "já é tombstone" e a coluna que o usuário escolhe são a **mesma coluna**:

```sql
v_sent_email := 'anonimizado+' || p_candidato_id::text || '@invalido.local';
...
IF v_email LIKE 'anonimizado+%@invalido.local' THEN
  RETURN jsonb_build_object('resultado', 'ja_anonimizado', ...);  -- zero coluna tocada
END IF;
```

O predicado é um `LIKE` de **prefixo + domínio**, não a igualdade com `v_sent_email`. Qualquer linha
de `candidatos` cujo `email` case o padrão faz a função retornar sucesso **sem executar nada**.

**Cenário concreto.** Uma pessoa se cadastra com `anonimizado+qualquercoisa@invalido.local` (a
`check_email_format` viva aceita — é `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`, e nada
valida o domínio). Ela pede a exclusão. A EF roda:
`passo 1` apaga o currículo → `passo 2` recebe `resultado: 'ja_anonimizado'`, que a linha
`index.ts:740` aceita como sucesso → `postgres_concluido_em` carimbado → `passo 3` apaga a conta do
Auth → `passo 4` **envia o recibo dizendo que os dados foram apagados**. Estado real: **nome, CPF,
celular, data de nascimento, endereço e cidade intactos em `candidatos`**, `logs_acesso`,
`autorizacoes` e `notificacoes_enviadas` intocados, `historico_candidatura.ator` apontando para um
usuário do Auth que não existe mais. O recibo é uma declaração de conformidade falsa.

O mesmo caminho é alcançado sem má-fé: qualquer futuro import/seed que use esse padrão de e-mail,
ou uma segunda fase que reuse o namespace `anonimizado+`.

**Fix.** O marcador tem de ser **derivado do id da própria linha** (que é o que a função já constrói
para escrever) e não um padrão aberto:

```sql
  -- ⚠ A sentinela e IGUAL, nunca LIKE: `email` e escrita pelo usuario no cadastro, e um
  -- LIKE de prefixo faz qualquer endereco `anonimizado+…@invalido.local` escolhido por
  -- alguem passar por tombstone — a funcao devolveria `ja_anonimizado` com 100% da PII
  -- intacta, e a EF carimbaria `postgres_concluido_em` e mandaria o recibo.
  IF v_email = v_sent_email THEN
```

Cinto secundário, porque a igualdade sozinha depende de `p_candidato_id` nunca mudar: exigir também
que o resto do tombstone esteja de pé antes de declarar no-op —
`AND v_user_id IS NULL AND v_data_nascimento = DATE '1900-01-01'`. E a auto-verificação de
`000006:773-784` precisa ganhar um caso que insira uma fixture com `email =
'anonimizado+intruso@invalido.local'` e exija `resultado = 'anonimizado'` (nunca `ja_anonimizado`).

---

## WARNINGS

### WR-01 · O `plano.contagens` persistido SUPERESTIMA o que o tombstone mutou — e ele é o registro probatório que sobrevive ao titular

**Arquivos:** `supabase/functions/executar-direito-titular/index.ts:993-1023`,
`supabase/migrations/20260805000005_p45_plano_e_dry_run.sql:184-194`

`somarPassosDoBanco` soma **todos** os inteiros do bloco. Para `tombstone_candidato` isso é
`candidatos(1) + candidaturas_vinculadas + devolutivas_candidato + disponibilidade +
solicitacoes_dados`. O tombstone toca **uma** linha de `candidatos` e **nenhuma** de
`disponibilidade` ou `solicitacoes_dados`. Um titular com 9 candidaturas produz
`contagens.tombstone_candidato ≈ 14`. Esse número é gravado no `plano` **depois de esvaziado**
(`index.ts:803-810`) e é o que resta como prova permanente da exclusão. `contagens.storage_remove`
tem o mesmo problema: conta `ponteiro_morto` (caminhos que não existiam) como apagados.

**Fix.** Consumir as contagens **do retorno de `anonimizar_candidato`** (`passos`, `000006:522-534`),
que reporta `ROW_COUNT` real, e reservar as do `plano_exclusao_titular` para o campo separado
`previsto`. Para o Storage, usar o tamanho do conjunto efetivamente devolvido por `remove()`.

---

### WR-02 · `enumerarObjetosTitular` descarta marcadores de pasta e nunca recursa — uma mudança futura de convenção deixa PII para trás em silêncio

**Arquivo:** `supabase/functions/executar-direito-titular/helpers.ts:156-169`

`list()` não é recursivo e `l.id === null` (marcador de pasta) é `continue`. Hoje o esquema é plano
(`{authUid}/{uuid}.pdf`, `cvUploadService.ts:101`), então está **correto**. Mas o dia em que alguém
passar a gravar `{authUid}/{candidaturaId}/{uuid}.pdf`, a enumeração devolve **zero objetos**, o
laço não roda, `storage_concluido_em` é carimbado (`index.ts:708-711` diz explicitamente que zero é
sucesso), e o recibo afirma que o currículo foi apagado. E o guard de falha fechada
(`index.ts:884-886`, `doBanco>0 && doList===0`) **não pega**, porque `curriculo_url` também estaria
apontando para a subpasta e entraria na união.

**Fix.** Falhar alto quando um marcador de pasta aparecer, em vez de descartá-lo:

```ts
if (l.id === null) {
  throw new Error("prefixo do titular contem subpasta — a enumeracao deste motor e de UM nivel");
}
```

---

### WR-03 · `remove()` recebe strings do banco sem revalidar o prefixo `{authUid}/`, sob service_role

**Arquivos:** `supabase/functions/executar-direito-titular/index.ts:869-876` e `:690-694`

`doBanco` sai de `candidaturas.curriculo_url` sem nenhuma checagem, e vai direto para
`storage.remove()` com a service key — que ignora RLS. A validação de prefixo existe apenas no
caminho de escrita (`submit-candidatura/index.ts:191`), o que deixa qualquer linha legada,
importada ou escrita por outro caminho como entrada não-validada de uma remoção irreversível.

**Fix.** Filtrar na montagem do plano, e registrar o descarte como achado em vez de apagar:

```ts
const doBanco = (cands ?? [])
  .map((c) => c?.curriculo_url)
  .filter((v): v is string => typeof v === "string" && v !== "")
  // Defesa em profundidade: `remove()` roda com service_role e ignora RLS. Um
  // `curriculo_url` fora do prefixo do titular apagaria o CV de OUTRA pessoa,
  // irreversivelmente (sem PITR, Storage fora do backup).
  .filter((v) => v.startsWith(`${authUid}/`) && !v.includes(".."));
```

---

### WR-04 · A auto-verificação de `000006` escreve em `auth.users` e `candidatos` de PROD, com CPF gerado por `random()`

**Arquivo:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:650-701`, esp. `:662-663`

O bloco `DO` insere duas contas do Auth e dois candidatos em produção (revertidos por
`RAISE EXCEPTION 'P45-TOMBSTONE-OK'` — o envelope está correto e provado pela SONDA 6 §6d). Duas
consequências não declaradas: (a) o CPF é `'000.000.' || random(3) || '-' || random(2)`, sobre uma
coluna `UNIQUE` — o apply é **não-determinístico** e uma colisão faz a migration inteira falhar,
sem que a próxima pessoa entenda por quê; (b) o `INSERT` em `public.candidatos` dispara qualquer
trigger de `INSERT` daquela tabela contra dados de produção.

**Fix.** Derivar o CPF do UUID da fixture, que já é único por construção:

```sql
'000.000.' || lpad((('x' || substr(replace(v_user_a::text,'-',''),1,6))::bit(24)::int % 1000)::text, 3, '0')
           || '-' || lpad((('x' || substr(replace(v_user_a::text,'-',''),7,4))::bit(16)::int % 100)::text, 2, '0'),
```

e registrar no cabeçalho, em uma linha, quais triggers de `INSERT` existem em `public.candidatos` e
por que nenhum deles sai da transação.

---

### WR-05 · O contrato do dry-run não é uniforme: numa linha já anonimizada ele RETORNA em vez de levantar `P45DR`

**Arquivo:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:296-309` vs `:509-514`

O ramo de idempotência retorna **antes** do `IF p_dry_run`. Chamar
`anonimizar_candidato(<tombstone>, p_dry_run := true)` devolve normalmente com
`resultado: 'ja_anonimizado'`. A Task 1 do 45-11 exige registrar *"o SQLSTATE devolvido pelo
dry-run — tem de ser o ERRCODE combinado, **nunca** outro"*: se a linha escolhida para o dry-run já
for um tombstone, o gate mede um retorno normal e a evidência fica ambígua no exato item que o
portão existe para tornar inequívoco.

**Fix.** Documentar o par no `COMMENT` como contrato de DUAS terminações
(`P45DR` para linha viva, retorno `ja_anonimizado` para tombstone) **e** exigir na evidência do
45-11 que a linha exercitada tenha `ja_anonimizado = false` no `plano` **antes** da chamada — o
`plano_exclusao_titular` já devolve essa chave (`000005:172`).

---

### WR-06 · Se `user_id` já estiver NULL, o tombstone deixa `logs_acesso`, `autorizacoes.ip_aceite` e `historico_candidatura.ator` intocados — e ainda assim declara sucesso

**Arquivo:** `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:438-444`, `:461-467`, `:477-479`

Os três predicados são guardados por `v_user_id IS NOT NULL`. A própria migration `000004` acaba de
transformar a FK em `ON DELETE SET NULL` — ou seja, **cria** o estado em que `candidatos.user_id` é
NULL sem que o tombstone tenha rodado (um `deleteUser` fora de ordem, exatamente o cenário que a
"rede" existe para amortecer). Nesse estado, `anonimizar_candidato` roda, devolve
`resultado: 'anonimizado'` e `v_n_logs = 0`, deixando `logs_acesso.email_tentativa`,
`logs_acesso.ip_address` e `autorizacoes.ip_aceite` **em claro** — dados que sozinhos re-identificam.

**Fix.** Quando `v_user_id IS NULL` mas a linha ainda não é tombstone, isso é um estado anômalo que
merece sinal, não silêncio:

```sql
  IF v_user_id IS NULL THEN
    RAISE WARNING 'P45: candidatos.user_id ja era NULL antes do tombstone (deleteUser fora de ordem, rede da FK SET NULL da 20260805000004). logs_acesso, autorizacoes.ip_aceite e historico_candidatura.ator NAO serao severados por este caminho — severar por candidato_id onde a coluna existir, e registrar o residuo';
  END IF;
```

e acrescentar ao jsonb de retorno um campo `severacao_por_user_id: false` para que a EF e a
evidência do 45-11 não leiam zero como "não havia".

---

### WR-07 · `retirar_candidatura` usa `NOT IN` sobre `etapa_atual` — a regra da fase é `IS DISTINCT FROM`

**Arquivo:** `supabase/migrations/20260805000007_p45_retirada_e_evento.sql:230` e `:464`

```sql
AND c.etapa_atual NOT IN ('aprovado', 'rejeitado')
```

A direção de falha **é fechada hoje** (com `etapa_atual` NULL o predicado avalia NULL, a linha não é
selecionada, e a retirada é recusada com `22023`) — e a coluna é `NOT NULL`
(`20260801000002:116`). Então não há defeito ativo. Mas é a mesma forma que a 42-06 mediu falhando
ABERTO, num arquivo cujo próprio comentário (`:188-193`) proíbe `NOT IN` três linhas acima.

**Fix.** Uniformizar, para que a próxima pessoa não tenha de reprovar o raciocínio:
`AND c.etapa_atual IS DISTINCT FROM 'aprovado' AND c.etapa_atual IS DISTINCT FROM 'rejeitado'`.

---

### WR-08 · `registrarCausa` engole a própria falha — a `causa` pode não existir justamente quando mais importa

**Arquivo:** `supabase/functions/executar-direito-titular/index.ts:663-672`

O `catch {}` vazio é declarado intencional ("já estamos no caminho de falha"), o que é defensável.
Mas a `causa` é, segundo o próprio docblock (`helpers.ts:76-79`), *"a única pergunta que importa às
3 da manhã"*. Se o `UPDATE` falhar, o pedido fica em `executando` sem `causa` e sem nenhum registro
de em qual sistema parou — indistinguível de uma execução que simplesmente nunca começou.

**Fix.** Não relançar, mas deixar rastro no único canal que sobra:
```ts
} catch {
  logErro("executar", "causa_nao_gravada", candidatoId, pedidoId, passo);
}
```

---

### WR-09 · `acao: 'executar'` não tem chamador em lugar nenhum — o motor destrutivo não tem gatilho

**Arquivos:** `src/features/privacidade/services/exclusaoService.ts:438` e `:479` (só `pedir` e
`cancelar`); varredura de `cron.schedule` em `supabase/migrations/`: zero ocorrência apontando para
esta EF.

O motor inteiro só roda se alguém invocar a EF com `acao: 'executar'`. Não existe UI que o faça,
não existe job agendado, e não existe caminho de operador dentro do produto — o `45-11-PLAN.md`
Task 3 o invoca **manualmente**, para a evidência do portão. Consequência: um pedido real fica em
`agendado` indefinidamente depois de vencidos os 15 dias, e o prazo do Art. 18 §6 passa em silêncio.

**Fix.** Não é defeito de código do que foi escrito — é uma etapa ausente. Registrar como item de
handoff explícito antes de o motor ser considerado entregue: um `pg_cron` diário que chame a EF com
`service_role` para cada pedido em `agendado` com `executar_em <= now()` (com o fix do CR-03 no
mesmo lugar, porque um executor agendado precisa resolver o titular sem `candidatos.user_id`).

---

## Guards conferidos e CORRETOS — o que o portão precisa saber que foi verificado

Estes foram lidos **contra a armadilha nomeada que cada um existe para defender** e passam:

| # | O que foi conferido | Onde | Veredito |
|---|---|---|---|
| G1 | **Guard NULL-safe, as três comparações** em `plano_exclusao_titular` e `anonimizar_candidato` usam `IS DISTINCT FROM`. Zero `NOT IN` nos guards. Com `p_candidato_id` inexistente ou já severado, o dono resolve NULL, `NULL IS DISTINCT FROM <uid>` é TRUE e a função **recusa**. | `000005:156-161`, `000006:270-275` | ✅ correto |
| G2 | **A metade (a) não foi afrouxada** pelo 45-12: chamador sem `auth.uid()` continua recusado com `42501` antes de qualquer leitura. A saída recusada (`auth.uid() IS NULL` sob `service_role`) **não** foi tomada. | `000005:127-130`, `000006:245-248` | ✅ correto |
| G3 | **O titular não alcança dado alheio pelo ramo estendido.** Para outro `p_candidato_id`, `v_dono` é o uid da outra pessoa, `IS DISTINCT FROM v_uid` é TRUE, as três condições são TRUE, e a função levanta `42501`. Exercitado nas DUAS direções por ambos os blocos de auto-verificação. | `000005:394-412`, `000006:836-851` | ✅ correto (a resposta à pergunta do operador é: **não**, dentro do guard — o furo está no CR-01, que é de ACL+intenção, não de titularidade) |
| G4 | **A ordem faixa-etária → sentinela de nascimento** é escrita na ordem certa e **provada por valor** (`1991-03-14` → `35-44`, nunca `55+`). O `COALESCE` de `gerar_bias_snapshot` dá precedência à coluna materializada. | `000006:320-331` e `:723-728`; `000003:302-313` | ✅ correto |
| G5 | **O scrub de `decisao_final_historico` é o ÚLTIMO statement do par**, depois do `UPDATE` em `decisao_final` — desarma `trg_decisao_final_snapshot` (AFTER UPDATE, sem `WHEN`), que recria a PII no arquivo. | `000006:376-394` | ✅ correto |
| G6 | **Nenhuma das 3 FKs `NO ACTION` é tocada.** Varredura de `ALTER TABLE`/`DROP CONSTRAINT`/`DELETE FROM` sobre `historico_candidatura`, `decisao_final`, `decisao_final_historico` em todas as migrations `20260805*`: **zero ocorrência**. Nenhuma linha é removida de tabela alguma — tudo é `UPDATE` in-place. | repo-wide | ✅ correto |
| G7 | **Zero `DELETE FROM storage.objects`** em migration ou EF. A remoção é só pela Storage Admin API. | repo-wide | ✅ correto |
| G8 | **O dry-run é o MESMO corpo**, terminado por `RAISE ... USING ERRCODE = 'P45DR'` após todos os statements executarem — não há `IF p_dry_run THEN <A> ELSE <B>`. E `anonimizar_candidato` **chama** `plano_exclusao_titular` (`:282`) em vez de copiar o predicado. | `000006:282`, `:500-514` | ✅ correto |
| G9 | **`P45DR` no caminho real é tratado como defeito, nunca sucesso** — a EF o distingue explicitamente e falha. O sentido inverso (erro real lido como dry-run) é impossível porque o ERRCODE é próprio. | `index.ts:724-735` | ✅ correto |
| G10 | **O erro de `deleteUser` NÃO é engolido** — ao contrário dos dois precedentes vivos do repositório (`cadastrar-candidato`, `gerenciar-usuario-rh`), aqui a rejeição vira `ErroDePasso("auth")`. E o hard delete é explícito: `deleteUser(authUid, false)`. | `index.ts:771-777` | ✅ correto |
| G11 | **O passo 3 relê `postgres_concluido_em` do BANCO**, não do espelho em memória, antes do único passo sem volta. | `index.ts:755-761` | ✅ correto |
| G12 | **O `list()` é paginado**, com teto de páginas que falha ALTO em vez de girar para sempre, e erro de listagem **lança** em vez de virar lista vazia. | `helpers.ts:149-170` | ✅ correto |
| G13 | **Falha fechada estrutural**: ponteiros vivos com enumeração vazia (`doBanco>0 && doList===0`) para o motor antes de qualquer mutação. | `index.ts:884-886` | ✅ correto |
| G14 | **Espaço de IDs**: `devolutivas_candidato.candidato_id` e `logs_acesso.user_id` referenciam `auth.users` e o plano usa `v_user_id` para elas; `ai_call_logs`, `candidate_ai_decisions`, `recruiter_alerts`, `autorizacoes.candidato_id` referenciam `public.candidatos(id)` e o plano usa `p_candidato_id`. **A divisão está certa nas duas direções** — conferida contra `20260612000002:32` e `20260609000001:158,231,344`. É o erro mais fácil de cometer nesta função e ele não foi cometido. | `000005:186-250` | ✅ correto |
| G15 | **`dedupe_key` re-namespaceada com o PK da linha** → `UNIQUE`-safe por construção; e `notificacoes_enviadas.candidatura_id` é `NOT NULL` (`20260721000001:78`), então o `||` não pode produzir NULL numa coluna `NOT NULL`. | `000006:490-496` | ✅ correto |
| G16 | **Os dois `inet` são TRUNCADOS, nunca anulados**: `network(set_masklen(...))` zera os bits de host de verdade (`set_masklen` sozinho seria fachada), e as duas colunas são `NOT NULL`. Provado por valor no bloco `DO` (`203.0.113.0`, `198.51.100.0`). | `000006:438-444`, `:461-467`, `:764-771` | ✅ correto |
| G17 | **Sentinelas contra as CHECKs vivas**: e-mail único por linha (coluna `UNIQUE`) e no formato; `celular` no formato; `data_nascimento` no passado e **fora de qualquer faixa etária real** (1900); `estado` preservada com justificativa registrada; `cpf`/`genero`/`como_conheceu` a NULL porque são nuláveis. Cada uma exercitada no `DO`. | `000006:335-368`, `:730-758` | ✅ correto |
| G18 | **`ai_call_logs.raw_response` é `jsonb NOT NULL`** e o tombstone atribui um literal `jsonb` (não texto); `parsed_reasoning` e `recruiter_alerts.message`/`candidato_id` são nuláveis. Nenhum dos cinco `UPDATE` do ERASE-09 pode abortar por `NOT NULL` ou por tipo. Conferido em `20260609000001:154-205,336-352`. | `000006:407-467` | ✅ correto |
| G19 | **Supressão k=5 com complementar**: `suprimida_primaria` é o único sítio do limiar; a complementar é a menor remanescente com desempate determinístico; `n_total` **sai do payload** quando há supressão (duas incógnitas, uma equação); a razão 4/5 do relatório inteiro cai quando a referência é suprimida; nenhum campo derivado viaja em célula suprimida. O caso degenerado "todas primárias" não produz falsa complementar (`v_complementar` NULL não casa `faixa` `NOT NULL`). | `000003:328-475` | ✅ correto |
| G20 | **Item 4 do portão**: `git log` da fase — zero commit com bypass do hook. As três ocorrências de "no-verify" no histórico são **declarações de conformidade** ("zero --no-verify"), não bypasses. | `git log` | ✅ correto |
| G21 | **`registrar_pedido_exclusao`/`cancelar_pedido_exclusao`/`retirar_candidatura` sob o `GRANT` a `authenticated`**: as três são não-destrutivas e escopadas ao próprio titular pelo guard. O `GRANT` **não** as expõe a dano — só `anonimizar_candidato` é o problema (CR-01). `gerar_bias_snapshot` corretamente **não** entrou de carona na `000009`. | `000009:126-144` | ✅ correto |

---

## Condição de reabertura do portão

O item 2 dos cinco (code review bloqueante ANTES do apply) fecha quando:

1. **CR-01** tem guard de intenção no corpo (ou o `GRANT` de `anonimizar_candidato` é retirado e a
   EF passa a chamá-la pelo `supabaseAdmin`), com a asserção correspondente no smoke.
2. **CR-02** tem a conferência refeita sobre o pós-estado do bucket, e o smoke exercita a
   **retomada** de um passo 1 parcial.
3. **CR-03** tem caminho de retomada que não dependa de `candidatos.user_id`.
4. **CR-04** severa `curriculo_url` e `curriculo_nome_original`, com asserção negativa nova na
   Task 3 do 45-11: *zero linha de `candidaturas` do titular com `curriculo_url` contendo o
   `auth.uid()` executado*.
5. **CR-05** severa `preferencias_notificacoes.created_by` **ou** o plano enumera os bloqueadores
   e a EF recusa antes do passo 1; e os dois `COMMENT` param de afirmar um tratamento que não existe.
6. **CR-06** troca o `LIKE` por igualdade, com fixture de intruso no bloco `DO`.

Os nove WARNINGs não bloqueiam o apply, mas **WR-01, WR-03 e WR-09** deveriam ser fechados antes da
execução real da Task 3, porque os três afetam o que a evidência do portão vai medir.

---

_Reviewed: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer), depth=deep_
_Escopo: motor destrutivo da Phase 45. Phase 47 (`src/features/transparencia/`, migrations `20260809*`) fora de escopo por instrução._
