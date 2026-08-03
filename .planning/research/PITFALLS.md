# Pitfalls Research

**Domain:** LGPD-OPS — retenção, purga, exclusão e direitos do titular (Art. 18/20) adicionados a um ATS **já em produção com PII real** (Supabase Postgres + Storage + Edge Functions + pipeline transacional de e-mail)
**Researched:** 2026-07-29
**Confidence:** MEDIUM-HIGH

> Fatos de plataforma Supabase (PITR/backup, Storage, cascade): **MEDIUM** — cross-checados entre Context7/docs oficiais e fetch direto de `supabase.com/docs/guides/platform/backups`.
> Fatos jurídicos LGPD: **MEDIUM** — fontes secundárias brasileiras convergentes; a ANPD não regulamentou o Art. 20.
> Fatos sobre **este** codebase: **HIGH** — verificados por grep no repositório, citados com `arquivo:linha`.
> Grafo de FKs em PROD: **HIGH** — vem de `.planning/research/FK-AUDIT-LIVE.md`, coletado ao vivo via `pg_constraint`. **Esse arquivo tem precedência sobre este em qualquer divergência.**

> **Numeração de fases:** o M8 começa na **Phase 42**. As referências abaixo (F42…F47) são agrupamentos propostos, não fases decididas — o roadmapper atribui os números finais. O que importa é a **ordem** e as dependências (ver `## Pitfall-to-Phase Mapping`).

---

## Contexto que muda o desenho — cinco achados verificados

Não são hipóteses. Cada um altera uma premissa do kickoff.

1. **A janela de retenção já foi prometida por escrito, em produção.**
   `src/features/cadastro/components/steps/AutorizacoesStep.tsx:62-66` — a copy do checkbox `autorizacao_retencao_curriculo` diz: *"Concordo que a Beauty Smile mantenha meu currículo em banco de dados **por até 2 anos** para futuras oportunidades, mesmo que eu não seja selecionado(a) no processo atual."* A "decisão de negócio em aberto" (6 meses? 2 anos? 5 anos de prescrição trabalhista?) **já tem um teto contratual de 2 anos** para todo candidato cadastrado até hoje. 5 anos = reter além do consentido. Menos que 2 anos é seguro, mas é mudança de promessa.

2. **Os consentimentos vêm pré-marcados.**
   `src/features/cadastro/schemas/candidatoSchema.ts:360-361` (`z.boolean().default(true)`) + `CadastroMultiStepForm.tsx:245-247` (`autorizacao_comunicacao: true`, `autorizacao_retencao_curriculo: true`). O `true` gravado **não distingue "o candidato marcou" de "o candidato não desmarcou"**. Isso contamina a base legal de qualquer purga que consuma essa coluna. Existe ainda um **quarto** consentimento órfão não citado no kickoff: `autorizacao_analise_video` (`AutorizacoesStep.tsx:68-74`), esse com default `false` — e portanto uma promessa de *não fazer* que também precisa ser verificada.

3. **Este projeto já tem uma política de exclusão documentada e nunca implementada — há 7 semanas.**
   `supabase/migrations/20260609000001_prompt_library_schema.sql:311-333` cria `data_deletion_log` e o comentário diz: *"The Art.18 `delete_candidate_data()` function itself is **deferred to Phase 15**"*. A Phase 15 aconteceu, o M2 fechou, e `grep delete_candidate_data` só retorna comentários. Há também `limpar_logs_antigos()` em `docs/sql/sql/01-setup-inicial.sql:88` com o `cron.schedule` **comentado na linha 103**. O M8 não adiciona compliance a um sistema neutro — **remove compliance theater pré-existente**.

4. **A premissa central do kickoff sobre a "tensão purga × auditoria" estava errada.**
   O FK-AUDIT-LIVE corrige: `decisao_final.por_usuario NOT NULL` aponta para o `auth.users` do **recrutador**, não do candidato — apagar um candidato **nunca toca essa coluna**. O bloqueio real do `deleteUser` de um candidato é **`historico_candidatura.ator`** (FK `NO ACTION` para `auth.users`, populada **pelo próprio candidato** a cada transição própria do funil). A tensão existe, mas mora em outro lugar — e um plano desenhado contra a premissa antiga desenha a solução errada.

5. **Existe drift repo→PROD confirmado, com causa identificada, exatamente na FK mais crítica.**
   `candidatos.user_id → auth.users`: o repositório diz `ON DELETE SET NULL`; **PROD tem `ON DELETE CASCADE`**. Causa: `ADD COLUMN IF NOT EXISTS` sobre coluna pré-existente do schema legado Figma Make → statement virou no-op → a FK nunca foi alterada. Consequência operacional: apagar `auth.users` **cascateia** para `candidatos` → `candidaturas` → e bate nas 3 FKs `NO ACTION`, levantando 23503. Isso significa duas coisas: (a) o comportamento de exclusão que qualquer um leria nos arquivos é ficção; (b) **o mesmo idioma pode ter silenciado outras cláusulas** — vale procurar `ADD COLUMN IF NOT EXISTS` em todas as migrations.

**Consequência transversal:** a purga é a única feature deste projeto cujo bug **destrói evidência que não volta**. Toda a disciplina abaixo deriva disso.

---

## Critical Pitfalls

### Pitfall 1: "Se der errado a gente restaura o backup" — a rede de segurança que não existe

**What goes wrong:**
Um `DELETE` com predicado errado roda em produção. A resposta reflexa é "restaura o backup". Descobre-se então:
- O plano **Pro retém 7 dias** de backups diários — não 30 (Team 14, Enterprise até 30).
- **PITR é add-on pago** (Pro/Team/Enterprise, exige ≥ compute Small), janela 7–28 dias conforme o tier, RPO de até 2 minutos. Se não foi contratado, não existe.
- Restaurar é **operação de projeto inteiro, com o projeto inacessível durante o processo**. Você não restaura "só `candidatos`" — reverte tudo, inclusive candidaturas legítimas, ledger de e-mail e histórico criados depois. Senhas de roles customizados não vêm no backup diário e precisam ser resetadas; subscriptions/replication slots precisam ser dropados e recriados.
- **Backups de banco NÃO incluem objetos do Storage.** A doc oficial é literal: *"Restoring an old backup does not restore objects you deleted after that backup."* Os PDFs de currículo apagados **não voltam por nenhum caminho**.

**Why it happens:**
"Managed Postgres" cria a sensação de que backup é problema resolvido. Ninguém lê a página de backups até precisar dela.

**How to avoid:**
- **Antes de existir qualquer código de purga**, verificar no dashboard se o add-on PITR está ativo e qual a janela. Registrar como fato datado em `.planning/`, não como suposição.
- Habilitar PITR — ou aceitar o risco **por escrito, com assinatura do Fernando** — como **pré-condição da fase de purga**. Mantê-lo ligado durante todo o rollout e a primeira execução real do cron.
- `supabase db dump` manual das tabelas de PII **imediatamente antes** do primeiro run real, guardado fora do Supabase, **com data de descarte definida no ato** (o dump é PII; não pode virar shadow database eterno).
- Para Storage, onde não há rede nenhuma: **soft-delete obrigatório** — mover o objeto para um prefixo `_pending_purge/` (copy + remove via API) e só apagar de verdade após a janela de graça.
- Desenhar toda a purga como **marcar → janela de graça → apagar**, com o hard-purge nunca no mesmo deploy que o soft-delete.

**Warning signs:**
- "Podemos reverter via backup" numa PLAN.md sem citar a janela em dias.
- O plano de purga não trata Storage separadamente do banco.
- Não existe artefato dizendo "PITR: ligado/desligado, janela = N dias, verificado em `<data>`".

**Phase to address:** **F42** (inventário/política) — gate de entrada da fase de purga.
**Confidence:** MEDIUM (docs oficiais Supabase, cross-checadas).

---

### Pitfall 2: O predicado de retenção errado — NULL, timezone e "candidatura em andamento"

**What goes wrong:**
Quatro erros clássicos, todos silenciosos:
- **NULL come linhas.** `WHERE data_decisao < now() - interval '2 years'` é `NULL` para toda candidatura sem decisão → essas linhas **nunca são purgadas**. Vazamento por omissão: o auditor encontra PII de 2024 viva num sistema que "tem política de retenção". O espelho é pior: `WHERE NOT (data_decisao > cutoff)` também é `NULL`, com comportamento invertido conforme onde o `NOT` cai. Este projeto tem estados sem decisão por design.
- **Âncora errada.** Purgar por `created_at` da candidatura, e não pelo **fim do tratamento** (decisão final / última interação), apaga gente que ainda está no funil.
- **Timezone.** O sistema opera em `America/Sao_Paulo` (M6/AGEND, M7/TIMELINE); o Postgres opera em UTC. `date_trunc('day', now())` vs `now() AT TIME ZONE 'America/Sao_Paulo'` desloca a fronteira em até 3h — irrelevante para 2 anos, **decisivo** para uma janela de graça de 30 dias que o candidato conta no calendário dele.
- **`interval` calendárico vs. dias.** `interval '2 years'` é bem-comportado; `interval '730 days'` diverge em bissextos.

**Why it happens:**
O predicado é escrito uma vez, lido por ninguém, e testado contra 5 linhas onde tudo está preenchido.

**How to avoid:**
- **Uma única view canônica** `v_candidaturas_purgaveis` que encapsula o predicado, com `COALESCE` explícito para toda data nullable e uma cláusula de estado em **allowlist** de etapas terminais — nunca `NOT IN` de etapas ativas. Allowlist falha fechado; denylist falha aberto quando um enum novo é adicionado (e este projeto adiciona enums).
- A purga **só lê dessa view**. Nunca `DELETE ... WHERE` inline. Grep-guard: no máximo uma ocorrência de `interval` nas migrations de purga.
- Fixtures obrigatórias: `data_decisao IS NULL`; linha exatamente na fronteira (cutoff ± 1s); linha em etapa ativa mais velha que o cutoff; candidatura reaberta/retrocedida.
- Congelar o "agora" numa variável (`v_agora timestamptz := now()`) usada por todo o job — senão statements diferentes do mesmo job usam cutoffs diferentes.

**Warning signs:**
- Mais de um lugar define o cutoff.
- Nenhum teste com `NULL` na coluna de data.
- O predicado usa `NOT IN (...)` de etapas.

**Phase to address:** **F45** (Retenção & Purga). O predicado é o deliverable de maior risco do milestone — merece uma PLAN só dele.
**Confidence:** HIGH (semântica SQL, verificável).

---

### Pitfall 3: CASCADE apagando a evidência — e o grafo real não é o que os arquivos dizem

**What goes wrong:**
Um `DELETE FROM candidatos WHERE id = $1` remove silenciosamente centenas de linhas em tabelas que ninguém listou. O FK-AUDIT-LIVE mostra que, para `candidaturas(id)`, **25 das 28 FKs são `ON DELETE CASCADE`** — incluindo todo o corpo psicométrico (`respostas_*`, `scores_*`, `redacoes_candidato`, `cognitivo_respostas`, `entrevista_*`) **e `notificacoes_enviadas`**. Só três são `NO ACTION`: `historico_candidatura`, `decisao_final`, `decisao_final_historico` — e essas três são `NO ACTION` por **default acidental** (nenhuma cláusula `ON DELETE` foi escrita), não por decisão.

Os três danos concretos:
1. **A idempotência do pipeline de e-mail é colateral.** `notificacoes_enviadas.candidatura_id` é CASCADE: apagar uma candidatura **apaga o ledger dela**, destruindo `UNIQUE(dedupe_key)` — o único mecanismo que impede reenvio (ver Pitfall 7).
2. **A auditoria de viés desbalanceia retroativamente.** `bias_audit_log` é série longitudinal (regra 4/5 EEOC). Purgar linhas antigas muda o denominador: o relatório de 2027 passa a "provar" ausência de viés porque o grupo desfavorecido foi apagado.
3. **A evidência de decisão humana some.** Não pela constraint `por_usuario` (essa aponta para o recrutador — ver correção nº 4 do contexto), mas porque a **linha inteira** de `decisao_final` desaparece se alguém "resolver" o 23503 trocando `NO ACTION` por `CASCADE`. Esse é o atalho que vai ser proposto no primeiro erro 23503 — e é exatamente o errado.

**Why it happens:**
CASCADE é escrito anos antes, por um motivo bom (integridade), e nunca reavaliado sob a ótica "o que acontece quando alguém pede para ser esquecido". A referência é direta: *"o risco mais comum com CASCADE é o delete em larga escala não intencional, onde um único DELETE no pai remove silenciosamente milhares de linhas relacionadas"*.

**How to avoid:**
- **Partir do FK-AUDIT-LIVE, não das migrations.** Ele já existe e é autoritativo. Reexecutar a consulta de `pg_constraint` como parte do gate da F42 (o grafo pode ter mudado desde 29/07).
- **Classificar cada tabela em exatamente uma de três categorias** — artefato de decisão, não escolha em tempo de código:
  - **HARD-DELETE** (a linha É o titular): `respostas_*`, `scores_*`, `redacoes_candidato`, `cognitivo_respostas`, `disponibilidade`, `entrevista_*`, objeto no Storage.
  - **ANONIMIZAR IN-PLACE** (a linha é evidência, o conteúdo é PII): `historico_candidatura`, `decisao_final`, `decisao_final_historico`, `bias_audit_log`, `notificacoes_enviadas`, `ai_call_logs`, `candidate_ai_decisions`.
  - **PRESERVAR INTACTO** (não é PII do titular): `usuarios_rh`, `vagas`, `config_*`.
- **Nunca "resolver" um 23503 trocando `NO ACTION` por `CASCADE`.** O 23503 é o schema fazendo o trabalho certo. A resposta é anonimizar a linha filha e desreferenciar o ponteiro (`SET NULL` na coluna, ou UUID desreferenciado), preservando a linha. É exatamente o que a orientação de accountability diz: *"reter um registro sem o dado pessoal subjacente não viola a obrigação de apagamento; satisfaz o princípio de accountability"*.
- Teste de regressão: exclusão completa de um candidato sintético, **assertando contagem de linhas INALTERADA** em `historico_candidatura`, `decisao_final`, `decisao_final_historico`, `bias_audit_log`.
- Caçar o idioma `ADD COLUMN IF NOT EXISTS` em todas as migrations — foi ele que silenciou a cláusula FK de `candidatos.user_id` (achado nº 5).

**Warning signs:**
- Uma PLAN diz "delete cascata a partir de `candidatos`".
- Alguém propõe alterar uma das 3 FKs `NO ACTION` para CASCADE "para destravar a exclusão".
- Alguém propõe dropar `por_usuario NOT NULL` "para permitir anonimização" — isso destrói a invariante RNF-07a sem necessidade nenhuma, já que a coluna nem é do candidato.

**Phase to address:** **F42** (classificação em 3 categorias, a partir do FK-AUDIT-LIVE) → aplicado em **F44**.
**Confidence:** HIGH (FK audit ao vivo).

---

### Pitfall 4: O CV sobrevive à exclusão — objetos de Storage órfãos, irrecuperáveis

**What goes wrong:**
O mais confirmado e o mais fácil de errar. Supabase Storage é **dois armazenamentos**: metadados em `storage.objects` (Postgres) e o arquivo em S3. As consequências são simétricas e ambas ruins:

- **Apagar `candidatos`/`candidaturas` não toca em nada do Storage.** `ON DELETE CASCADE` de FK **não alcança o Storage**. O PDF do currículo — nome completo, endereço, telefone, histórico profissional, às vezes foto — **continua no bucket `curriculos` para sempre**, e o path (`{auth.uid()}/{uuid}.pdf`, D-10) vira intraçável assim que `auth.users` some.
- **Apagar a linha de `storage.objects` via SQL órfana o arquivo permanentemente.** As discussões oficiais são explícitas: *"deletar objetos via query SQL não remove o objeto do bucket e resulta no objeto ficando órfão"*; *"se você deletar apenas a linha de `storage.objects`, o dado do arquivo fica órfão e não há como se livrar dele"*. Resultado: um arquivo de PII que **não pode mais ser apagado por nenhum caminho suportado** — o pior desfecho possível para uma feature de exclusão.

O caminho correto é a **Storage API** (`storage.from('curriculos').remove([paths])`) ou a UI do dashboard, que apagam metadado **e** objeto S3.

**Why it happens:**
Todo o resto do sistema é Postgres, então "uma transação apaga tudo" é a intuição. E o modo errado (SQL) é o mais conveniente dentro de um `pg_cron`/RPC.

**How to avoid:**
- A exclusão **não pode ser um RPC puro de banco**. Tem que ser uma **Edge Function orquestradora**: (1) ler e **persistir** a lista de paths do Storage **antes** de apagar qualquer linha; (2) chamar `storage.remove()` e **verificar o retorno**; (3) só então executar o RPC de exclusão/anonimização. Ordem invertida = paths perdidos = órfãos permanentes.
- Guardar os paths no próprio `data_deletion_log` antes de apagar, para que uma falha parcial seja **retomável**.
- Job de reconciliação permanente: listar objetos em `curriculos` sem candidatura correspondente e alertar. Sem isso, órfãos acumulam invisíveis.
- **Grep-guard em CI** contra `DELETE FROM storage.objects`, no mesmo estilo do guard de `service_role` que o projeto já tem.
- Não esquecer o segundo bucket: fotos de perfil RH (M5/A37) — o débito **IN-01 avatar-orphan** já está no backlog e é o mesmo bug.

**Warning signs:**
- A PLAN de exclusão não distingue "banco" de "Storage".
- Existe `DELETE FROM storage.objects` em qualquer arquivo.
- Ninguém sabe dizer quantos objetos existem em `curriculos` vs. quantas candidaturas existem.

**Phase to address:** **F44** (Exclusão & Portabilidade). É o item que mais provavelmente "parece pronto e não está".
**Confidence:** MEDIUM-HIGH (docs + múltiplas discussões oficiais convergentes).

---

### Pitfall 5: `auth.users` — o e-mail sobrevive, ou o CASCADE leva tudo junto

**What goes wrong:**
`auth.users` guarda `email`, `phone`, `raw_user_meta_data`, a identidade. Não aparece no `database.types.ts`. Dois erros espelhados:

- **Não apagar:** o e-mail (PII direta) continua vivo, o candidato ainda loga e vê um painel quebrado, e o recadastro colide com a UNIQUE de e-mail.
- **Apagar primeiro:** e aqui o FK-AUDIT-LIVE traz a surpresa — `candidatos.user_id → auth.users` é **`ON DELETE CASCADE` em PROD** (o repositório diz `SET NULL`; é ficção). Um `deleteUser` cascateia `candidatos` → `candidaturas` → e bate nas 3 FKs `NO ACTION`, levantando **23503**. Ou seja: hoje, em produção, **`deleteUser` de um candidato com histórico simplesmente falha** — e o bloqueio real é `historico_candidatura.ator`, populada **pelo próprio candidato** a cada transição do funil.

Isso é bom (o schema está impedindo destruição de auditoria) mas precisa ser tratado deliberadamente: a ordem de operações não é opcional, é a única que funciona.

**How to avoid:**
- **Ordem canônica, escrita e testada** na EF orquestradora:
  1. coletar e persistir paths do Storage
  2. apagar objetos do Storage via API
  3. **anonimizar** as tabelas de auditoria e **desreferenciar** `historico_candidatura.ator` (é o bloqueio real)
  4. hard-delete das tabelas de conteúdo
  5. `auth.admin.deleteUser` **por último**
  6. gravar `data_deletion_log`
- Usar `deleteUser(id, shouldSoftDelete: true)` durante a janela de graça; o hard só no purge final. Isso dá reversibilidade real para pedido feito por engano.
- **Tratar as 5 tabelas `SET NULL` explicitamente.** O FK-AUDIT-LIVE lista: `ai_call_logs.candidato_id`, `candidate_ai_decisions.candidato_id`, `logs_acesso.user_id`, `recruiter_alerts.candidato_id`, `autorizacoes.user_id`. Um `DELETE` que "funciona" deixa **5 tabelas com linhas órfãs contendo PII derivada** — e detecção por nome de coluna não pega nenhuma delas. `ai_call_logs` é a mais grave: pode conter o prompt, isto é, o CV inteiro.
- Testar os dois caminhos reais: "candidato excluído tenta logar" e "candidato excluído se recadastra com o mesmo e-mail".

**Warning signs:**
- A PLAN chama `deleteUser` na primeira etapa.
- O 23503 aparece e alguém propõe alterar a FK em vez de anonimizar (ver Pitfall 3).
- Nenhum teste de "login pós-exclusão".
- As 5 tabelas `SET NULL` não aparecem na lista de tratamento.

**Phase to address:** **F44**.
**Confidence:** HIGH (FK audit ao vivo) + MEDIUM (docs Supabase).

---

### Pitfall 6: O ledger de e-mail guarda o endereço duas vezes — e ambas são `NOT NULL`

**What goes wrong:**
`notificacoes_enviadas` tem `destinatario_email text NOT NULL` (`20260721000001:81`) e, desde a P37-lacunas, `destinatario_original text NOT NULL` **sem default** (`20260722000002:100`). O e-mail do candidato está gravado **duas vezes por linha**, e o comentário da tabela diz literalmente *"Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8)"* (`20260721000001:144`). O débito chegou.

Três armadilhas encadeadas:
1. Uma anonimização que faça `SET destinatario_email = NULL` **viola `NOT NULL` e aborta a transação inteira de exclusão** — provavelmente descoberto em produção, no primeiro pedido real.
2. **Apagar linhas do ledger destrói a idempotência.** `UNIQUE(dedupe_key)` é o único mecanismo contra reenvio. E o FK-AUDIT-LIVE mostra que `notificacoes_enviadas.candidatura_id` é **CASCADE** — ou seja, isso acontece **automaticamente** ao apagar uma candidatura, sem ninguém escrever um DELETE. Apagou → a varredura de retry da P41 (`pg_cron */15`, cap 5) pode reivindicar de novo e **reenviar um e-mail antigo**.
3. **O provedor tem retenção própria.** A orientação do Resend é conteúdo ~30 dias, logs ~90 dias, e registros de supressão/consentimento **nunca** apagados. Apagar do seu banco não apaga do processador.

**How to avoid:**
- **Anonimizar in-place, nunca deletar.** Substituir `destinatario_email`/`destinatario_original` por sentinel determinístico (`'purged@invalid'`) ou por **HMAC com chave secreta do Vault** (hash simples de e-mail é reversível por dicionário — Pitfall 8). Preserva `NOT NULL`, preserva `dedupe_key`, preserva idempotência, remove a PII.
- **Impedir o CASCADE de chegar ao ledger**: anonimizar o ledger **antes** de apagar a candidatura, ou trocar essa FK específica para `SET NULL`. Escolha explícita, registrada.
- **Retenção do ledger é decisão separada da exclusão do titular.** Um ledger com conteúdo de 90 dias + linha de auditoria permanente anonimizada é defensável; apagar linhas é risco operacional sem ganho de compliance (linha anonimizada não é PII).
- Se houver supressão/opt-out, ela vive em tabela própria com **apenas e-mail + data** — o único caso em que reter o endereço pós-exclusão é defensável, e precisa de base legal escrita.
- Abrir pedido de exclusão junto ao Resend (DPA) ou declarar a retenção do processador na política.

**Warning signs:**
- Qualquer `DELETE FROM notificacoes_enviadas`, ou um `DELETE FROM candidaturas` sem tratamento prévio do ledger.
- A anonimização escreve `NULL` em coluna `NOT NULL` (um teste pega isso em 2 minutos, se existir).
- A política de retenção não menciona o processador de e-mail.

**Phase to address:** **F44** (anonimização in-place) + **F45** (retenção do ledger). O `NOT NULL` vira teste de contrato.
**Confidence:** HIGH (schema + FK audit verificados).

---

### Pitfall 7: A varredura de retry reenvia para quem foi purgado — e o `dedupe_key` bloqueia o envio legítimo futuro

**What goes wrong:**
O M7 deixou três mecanismos vivos que interagem mal com exclusão:

- **A varredura `pg_cron */15` (P41)** varre pendentes e reenvia. Se a exclusão ocorreu entre o claim e o envio: (a) reenvia para o endereço ainda gravado no ledger, **notificando alguém que exerceu o direito ao esquecimento** — um incidente de privacidade cuja evidência é a caixa de entrada do reclamante; (b) ou falha no join com linhas já apagadas e fica em loop até o cap de 5.
- **`dedupe_key` no formato `{evento}:{candidatura_id}:{discriminador}`** (`20260721000001:149`). Numa anonimização **in-place** (id preservado), se o candidato se recandidatar, a chave idêntica já existe → o claim `INSERT ... ON CONFLICT DO NOTHING RETURNING id` volta vazio → **o e-mail legítimo nunca é enviado, silenciosamente**. É exatamente a classe do defeito CR-02 da P39 (guard que virou dead code): a ausência do envio não gera erro.
- **`net.http_post` é at-most-once, fire-and-forget** — falha descartada em silêncio. Com exclusão concorrente, o resultado é indeterminado e não observável.

**How to avoid:**
- **Suppression gate no ponto de envio, dentro da EF, imediatamente antes da chamada ao Resend** — não no trigger. A corrida com a exclusão acontece *depois* do trigger. Abortar com status terminal explícito (`suprimido_por_exclusao`) gravado no ledger.
- Ao anonimizar, **marcar as pendências do ledger como terminais** (`cancelado_por_exclusao`) na mesma transação, para que a varredura nunca as veja.
- **Regravar a `dedupe_key`** na anonimização, com discriminador de purga (`...:purged:<timestamp>`), liberando o namespace para envios futuros legítimos.
- Teste de concorrência obrigatório: exclusão disparada entre claim e envio → asserção de **zero e-mails** e status terminal no ledger.
- **Asserção sobre o que NÃO acontece.** A lição do W-01 da P39 (preheader não ramificado, invisível a asserções de texto visível) diz que testar "o e-mail certo saiu" é insuficiente. Aqui é preciso testar "**nenhum** e-mail saiu".

**Warning signs:**
- A fase de exclusão não menciona `notificacoes_enviadas` nem o cron `*/15`.
- O suppression check está no trigger, não na EF.
- Nenhum teste com exclusão concorrente ao envio.

**Phase to address:** **F44** — é seam cross-milestone com o COMM do M7; deve ser explícito no roadmap.
**Confidence:** HIGH (código do projeto) + MEDIUM (semântica pg_net).

---

### Pitfall 8: Anonimização trivialmente reversível — o erro que os reguladores mais encontram

**What goes wrong:**
A revisão do EDPB sobre right-to-erasure achou que *"a maioria das técnicas de anonimização na prática eram apenas pseudonimização — mascaramento reversível que não impede reidentificação"*, e que autoridades **não** aceitam isso como apagamento. Formas concretas neste sistema:

- `sha256(email)` sem salt: espaço pequeno e enumerável, reversível por dicionário em minutos.
- Manter `data_nascimento` + `cidade` + `cargo` + timestamp: numa rede de clínicas de uma cidade isso é frequentemente **único** — reidentificação por quase-identificadores. `historico_candidatura` (timestamps + etapa + vaga) sozinho já reidentifica 1-de-N.
- **A redação cultural é a bomba.** Texto livre autobiográfico: ex-empregadores, faculdade, situações pessoais, às vezes o próprio nome. Anonimizar `candidatos.nome` e deixar `respostas_cultura` intacta é anonimização zero.
- **Os artefatos de IA repetem a PII.** `analise_candidato_vaga` (resumo do CV = paráfrase do documento de identidade profissional), `entrevista_analises` (transcrição), `devolutivas_candidato`, e `ai_call_logs` — que, dependendo do que foi logado, contém o **prompt**, isto é, o CV inteiro. Note que `ai_call_logs` e `candidate_ai_decisions` são `SET NULL`: **sobrevivem por padrão a qualquer CASCADE**.
- PDFs de comparativo já gerados (M2/TRIAGEM-04), se persistidos.

**How to avoid:**
- **Inventário de PII coluna a coluna** é o primeiro deliverable do M8: para cada uma das ~60 tabelas do `database.types.ts`, marcar PII direta / quase-identificador / texto livre identificante / não-PII. Sem isso tudo o mais é chute — é a resposta direta ao achado do EDPB de que *"organizações não conseguem apagar o que não conseguem encontrar"*.
- **Texto livre e artefatos de IA: hard-delete, não anonimização.** Não existe anonimização confiável de prosa. `respostas_cultura`, `entrevista_analises`, `analise_candidato_vaga`, `devolutivas_candidato` e o corpo de `ai_call_logs` devem ser **apagados**; sobrevivem o score numérico e o vínculo desreferenciado, se a auditoria de viés precisar.
- **`anon` (PostgreSQL Anonymizer) não está disponível** neste projeto — confirmado ao vivo no FK-AUDIT-LIVE (ausente de `pg_available_extensions`, não é "não instalada", é **não instalável**). O primitivo é `UPDATE` de tombstone in-place via RPC `SECURITY DEFINER`. Não planejar em cima de extensão.
- Se hash for usado (ledger): **HMAC com chave no Vault**, documentando que a chave é destruída ao fim da retenção — só assim deixa de ser pseudonimização. `pgcrypto` 1.3 está instalado.
- **Teste de reidentificação como gate**: após anonimizar um candidato sintético, um script tenta reencontrá-lo por (data de nascimento + cidade + vaga + timestamp). Achou 1 linha → a anonimização falhou.

**Warning signs:**
- "Anonimizar" aparece numa PLAN sem definição operacional por coluna.
- `respostas_cultura` / `ai_call_logs` fora da lista de tabelas tratadas.
- `md5()`/`sha256()` de e-mail sem salt.

**Phase to address:** **F42** (inventário) é pré-requisito duro; execução em **F44**.
**Confidence:** MEDIUM-HIGH (EDPB + estrutura verificada).

---

### Pitfall 9: O export de portabilidade vaza mais do que deveria — a reincidência nº 1 deste codebase

**What goes wrong:**
"Baixe seus dados" é, tecnicamente, **um endpoint que faz `select('*')` em tudo que se refere ao titular e devolve para o navegador dele**. É exatamente o antipadrão que já causou dois incidentes aqui: o vazamento LGPD HIGH da Phase 8 (`listCandidaturas` com `select('*')` transmitindo `opcao_knockout_id`/`motivo_rejeicao`) e SEC-02/CR-01 na Phase 24. O CLAUDE.md registra a razão estrutural: **RLS é row-level e nunca column-level**.

O que vazaria num export ingênuo:
- `motivo_rejeicao` / `opcao_knockout_id` — o critério de rejeição, que **D-15 proíbe expor**.
- `rubric` do SJT e gabarito cognitivo — protegidos por column REVOKE / RPC DEFINER desde a P24.
- `observacoes_rh` de `agendamentos_entrevista` — explicitamente fora da allowlist do candidato desde a P33.
- `veredito` da redação, scores brutos, percentis Big Five (a P23/UX-07 tirou percentil bruto da devolutiva **de propósito** — RNF-12a).
- **Dados de terceiros**: nome/UUID do recrutador, notas de avaliadores, `bias_audit_log`.

E a ironia estrutural: o export roda com `service_role` numa Edge Function — **o único contexto do sistema onde RLS não protege absolutamente nada**. Todos os controles construídos nas P24/P32/P33 são contornados por construção.

**How to avoid:**
- **Allowlist declarativa, coluna a coluna, versionada em código** — nunca `select('*')`, nunca "tudo menos X". Uma constante `EXPORT_SCHEMA`, de forma que adicionar coluna ao banco **não** a adicione ao export. Fail-closed.
- **Teste de snapshot das chaves do JSON exportado**, que quebra quando uma chave nova aparece. É o único mecanismo que impede vazamento futuro por omissão.
- **Distinguir formalmente portabilidade (Art. 18 V — dados *fornecidos pelo titular*, formato interoperável) de acesso (Art. 18 II — confirmação e acesso).** Scores e avaliações **gerados pela empresa** não são "dados fornecidos pelo titular": incluí-los é escolha, não obrigação — e escolha cara, porque expõe critério e colide com D-15.
- **Verificação de identidade forte antes de entregar.** A orientação de DSAR é enfática: autenticação fraca gera divulgação à pessoa errada, o que é **um incidente de segurança em si, com dever de notificação**. Login ativo é o mínimo; para PII completa, re-autenticação recente (o projeto já tem o padrão GoTrue do M5/A37) + link com expiração curta (padrão da EF `get-curriculo-url` da P32).
- **Log de quem baixou o quê e quando** — criado desde o início, não depois do incidente.

**Warning signs:**
- `select('*')` em qualquer arquivo da fase (grep-guard em CI).
- O export inclui alguma coluna que a P24 protegeu com REVOKE.
- Não há teste de snapshot das chaves.

**Phase to address:** **F44**, com **code review bloqueante** — é a superfície de vazamento nº 1 do milestone.
**Confidence:** HIGH (histórico documentado do projeto).

---

### Pitfall 10: A confirmação de exclusão que mente

**What goes wrong:**
A tela diz "Todos os seus dados foram permanentemente excluídos". Na verdade sobrevivem: linhas anonimizadas de auditoria (legítimo), o ledger (legítimo), o backup dos últimos 7 dias (inevitável), os logs do Resend (processador), objetos órfãos no Storage (bug), `ai_call_logs` (esquecido — é `SET NULL`). A afirmação é **falsa**, e é uma declaração escrita da empresa ao titular, anexável a uma reclamação na ANPD.

O espelho, igualmente comum: uma "exclusão" que na verdade é `ativo = false`. O EDPB registra explicitamente: *"alguns controladores trataram desativação de conta como equivalente a apagamento, mas os dados pessoais subjacentes permanecem intactos no banco, o que não satisfaz o Art. 17"*.

**How to avoid:**
- A copy é **derivada do mapa de 3 categorias** (Pitfall 3), não escrita livremente. Redação honesta: *"Seus dados pessoais e seu currículo foram excluídos. Mantemos, de forma anonimizada e sem identificá-lo(a), o registro de que uma decisão foi tomada neste processo seletivo, por obrigação de auditoria. Cópias em backups de segurança são eliminadas automaticamente em até N dias."*
- **Nomear a janela de backup explicitamente** — é o único tratamento honesto de backups, e a literatura de GDPR converge: backups não podem ser editados cirurgicamente, mas devem ter expiração documentada.
- **A copy entra na verificação da fase**, com item de UAT que confere frase por frase contra o que o código faz.
- Gravar em `data_deletion_log` **o que foi apagado por categoria** (contagens por tabela), para que a confirmação seja auditável depois.

**Warning signs:**
- As palavras "todos" ou "permanentemente" na copy.
- Backup não mencionado em nenhum ponto da experiência do titular.
- A "exclusão" faz UPDATE e nenhum DELETE.

**Phase to address:** **F44** (copy é deliverable verificável, não detalhe).
**Confidence:** MEDIUM-HIGH.

---

### Pitfall 11: A fila do Art. 20 que ninguém trabalha — e a revisão que é teatro

**What goes wrong:**
Quatro modos de falha, todos presentes na literatura brasileira sobre o Art. 20:

1. **A fila existe e ninguém a abre.** O trigger notifica, a tela existe, o SLA fica vermelho — e nada acontece, porque nenhuma pessoa nomeada é responsável. A orientação de DSAR é direta: *"perder prazos de resposta é um dos gatilhos mais comuns de reclamação junto à autoridade"*, e o processo exige **atribuição explícita** (quem faz intake, quem executa, quem tem autoridade para negar).
2. **SLA exibido, não aplicado.** Um badge vermelho não é enforcement. Enforcement é escalonamento automático: e-mail ao administrador em D+7, D+12, D+14.
3. **Revisor = decisor.** Se `revisao_resultado` puder ser escrito pela mesma pessoa que gravou `decisao_final.por_usuario`, a revisão é nula por construção. A crítica dominante na literatura brasileira é exatamente essa: *"a 'revisão' se resume a reiterar a decisão do sistema sem reconsideração real"*.
4. **A revisão não pode mudar nada.** Se `revisao_resultado` é texto que não afeta `candidaturas.etapa_atual` nem `decisao_final`, a fila é um formulário de desabafo. O direito do Art. 20 é de **revisão**, o que pressupõe possibilidade de resultado diferente.

Agravante específico: o buraco **já está aberto em produção** — o candidato clica, `revisao_solicitada_em` é gravado, ninguém é notificado — e o relógio de 15 dias já corre para quem clicou. Em rigor, desde o SEC-03 (M4/P24), não desde a P39.

**How to avoid:**
- **O primeiro deliverable da fase Art. 20 não é a tela — é a consulta que lista os pedidos já pendentes hoje em PROD.** Existe passivo acumulado; ele precisa ser respondido antes ou junto do go-live da fila.
- **Tornar a auto-revisão estruturalmente impossível**, no mesmo espírito da constraint `por_usuario NOT NULL`: `revisao_por_usuario <> decisao_final.por_usuario`, ou exigir role `administrador` para revisar decisão de `recrutador`.
- A revisão precisa de **write path real**: RPC `registrar_revisao_decisao` que possa reabrir a candidatura (retroceder `etapa_atual`) ou mantê-la, sempre com justificativa mínima server-enforced — o projeto já tem o padrão (`rejeitar_candidatura` exige ≥50 caracteres). *Manter* é resultado válido; o que não pode é ser o único resultado possível.
- Escalonamento por `pg_cron` reusando o pipeline COMM, com o mesmo cuidado de heartbeat do Pitfall 12.
- Gravar `revisao_respondida_em` — sem isso, "cumprimos o prazo" é opinião, não medida.

**Warning signs:**
- A tela é planejada antes da consulta do passivo.
- Não existe constraint impedindo auto-revisão.
- `revisao_resultado` é o único write da feature.
- Ninguém consegue responder "quantos pedidos estão abertos agora e há quanto tempo?".

**Phase to address:** **F43** (Art. 20) — deve vir **cedo**; é a única lacuna com prazo legal correndo hoje.
**Confidence:** MEDIUM-HIGH (LGPD + código verificado).

---

### Pitfall 12: O `pg_cron` que parou — e ninguém percebe, porque a purga é invisível quando não acontece

**What goes wrong:**
`pg_cron` só dispara enquanto o banco está saudável; um incidente, um teto de conexões ou um projeto pausado **pula o schedule sem alertar** — o histórico em `cron.job_run_details` só fica com um buraco. Para quase toda feature isso é incômodo. Para retenção é **não-conformidade silenciosa**: dados que deveriam ter sumido em janeiro seguem vivos em julho, e a evidência de que a política "está implementada" (o `cron.schedule` existe) continua verdadeira.

O modo inverso é pior e igualmente silencioso: o job rodou, apagou 40.000 linhas em vez de 40, e como ninguém consulta o que sumiu, o defeito só aparece quando um candidato reclama — semanas depois, **fora da janela de 7 dias**.

**How to avoid:**
- **Toda execução escreve em `data_deletion_log`** — a tabela **já existe** desde `20260609000001` — com timestamp, versão da política/predicado, contagem por tabela, duração e modo (`dry_run` | `real`). A **ausência** de linha é o sinal de que o cron parou.
- **Dead-man switch**: alerta se a última execução for mais velha que intervalo + tolerância. Reusar o padrão `recruiter_alerts` criado na P23.
- **Kill switch lido em runtime**, no início de cada execução (flag em `configuracoes_empresa` ou tabela própria). Desligar a purga **não pode exigir migration**.
- **Cap de blast radius dentro da própria função**: se a contagem a apagar exceder N linhas ou X% da tabela, **abortar e alertar**. A prática de referência é exatamente essa ("não apagar mais que 10% numa execução, com override explícito para o primeiro backfill"). O primeiro run real — o que limpa o acumulado histórico — é justamente o que precisa do override consciente, e o mais perigoso de todos.
- Monitorar `cron.job_run_details WHERE status='failed'` no runbook.

**Warning signs:**
- Nenhuma linha nova em `data_deletion_log` desde a última execução esperada.
- O kill switch é "comentar o `cron.schedule` e aplicar migration".
- Não existe cap de linhas por execução.

**Phase to address:** **F45**.
**Confidence:** MEDIUM-HIGH (docs Supabase + prática de referência).

---

### Pitfall 13: O dry-run que nunca foi exercido — ou que executa código diferente do real

**What goes wrong:**
O modo dry-run existe, foi testado uma vez em dev, e nunca rodou em produção com dados reais. Ou pior: dry-run e execução real são **dois caminhos de código diferentes** — o dry-run faz `SELECT count(*) WHERE <predicado A>` e o delete usa `<predicado B>`, porque alguém editou um e não o outro. O dry-run então "confirma" com sucesso um número sem relação com o que será apagado.

Este é o parente direto do CR-02 da P39 (o guard que era dead code): **um caminho que ninguém exercita não é um guard, é decoração**.

**How to avoid:**
- **Um único predicado, uma única query.** A função executa `DELETE ... RETURNING id` **dentro de uma transação** e, se `p_dry_run`, faz `RAISE EXCEPTION`/`ROLLBACK` depois de contar. Zero divergência possível entre o que foi contado e o que seria apagado.
- **O dry-run roda em produção, por `pg_cron`, semanas antes do modo real**, gravando `modo='dry_run'` em `data_deletion_log`. Isso produz o histórico de "quantas linhas seriam apagadas por dia" — o único jeito de detectar um predicado errado **antes** que ele custe dados.
- **Row-count diffing como gate de promoção**: só ligar o modo real após N execuções de dry-run consecutivas dentro de um envelope esperado e revisado por humano.
- **Prova por execução, não por leitura** — o padrão que a P37 já estabeleceu (Postgres 17 descartável). Restaurar um dump com forma de PROD, rodar a purga real lá, e **diffar contagens antes/depois tabela a tabela**. É o análogo da "prova em produção" que validou o pipeline do M7.

**Warning signs:**
- `IF p_dry_run THEN <query A> ELSE <query B>` — dois corpos de query no mesmo procedimento.
- Nenhuma linha `modo='dry_run'` em `data_deletion_log` antes do primeiro run real.
- O merge do código e o primeiro run real acontecem no mesmo dia.

**Phase to address:** **F45**. **Ligar o modo real é checkpoint de orquestrador separado**, com autorização explícita do Fernando — exatamente como `NOTIFICACOES_MODO=teste→producao` foi tratado no M7.
**Confidence:** MEDIUM-HIGH (prática de referência + padrão do projeto).

---

### Pitfall 14: Honrar retroativamente um consentimento pré-marcado

**What goes wrong:**
A purga vai consumir `autorizacao_retencao_curriculo` como base legal. Mas o checkbox vem **pré-marcado** (`candidatoSchema.ts:360-361` + `CadastroMultiStepForm.tsx:246-247`). Consentimento pré-marcado não é livre nem inequívoco. Tratar o `true` armazenado como "o candidato autorizou reter meu currículo por 2 anos" apoia toda a política de retenção numa base legal frágil — e o dano é **reter demais**, o oposto do objetivo.

Existe também o `autorizacao_comunicacao`, já identificado no kickoff. E um **quarto**: `autorizacao_analise_video` (default `false`) — uma promessa de *não fazer*. Se qualquer análise de entrevista tocar em vídeo/transcrição, é preciso verificar se esse `false` está sendo honrado.

E o achado incidental do FK-AUDIT-LIVE: existe uma tabela **`preferencias_notificacoes`** já no banco. Pode ser reuso em vez de tabela nova — **inspecionar antes de projetar qualquer opt-out**.

**How to avoid:**
- **O default defensável para linhas pré-enforcement é "consentimento não confiável"**, não "consentimento dado". Concretamente: candidatos cadastrados antes da data de enforcement recebem a política **conservadora** (retenção mínima ligada à finalidade do processo seletivo), não a extensiva (banco de talentos por 2 anos). É seguro juridicamente e alinha com a pré-condição do TALENT registrada no PROJECT.md.
- **Marcar a data de corte com coluna explícita** (`consentimento_versao` ou `consentimento_em`), para que a purga nunca precise adivinhar. Sem essa coluna, a distinção pré/pós-enforcement fica **impossível depois** — é uma janela que fecha.
- **Desmarcar os defaults** (`default(false)` + checkbox vazio) para novos cadastros: 2 linhas, alto valor de conformidade, e deve vir **antes** de qualquer código que leia a coluna — o passivo cresce a cada cadastro novo.
- **Nunca remover a coluna nem o registro do que foi perguntado.** Tirar o checkbox da UI é decisão de produto legítima; apagar a evidência de que a pergunta foi feita destrói a prova de conformidade. Se `autorizacao_comunicacao` for aposentado, a coluna e os valores históricos ficam; muda a UI.
- Se a decisão for **honrar** `autorizacao_comunicacao`: cuidado com a fronteira transacional. Um candidato que desmarcou e depois se candidata **precisa** receber confirmação e decisão — é o serviço que ele pediu. O opt-out só pode alcançar comunicações não solicitadas (que hoje não existem). Honrar de forma ampla demais quebra o pipeline COMM e cria um funil silencioso — o pior dos mundos, porque parece conformidade e é abandono do candidato.

**Warning signs:**
- A política de purga lê `autorizacao_retencao_curriculo` sem filtro de data.
- Uma PLAN propõe `DROP COLUMN autorizacao_comunicacao`.
- O checkbox continua pré-marcado depois da fase de consentimentos.
- Ninguém abriu `preferencias_notificacoes` antes de desenhar o opt-out.

**Phase to address:** **F46** (Consentimentos) — mas o **desmarcar defaults + coluna de versão** deve ser puxado para **F42**.
**Confidence:** HIGH (código verificado) + MEDIUM (interpretação LGPD).

---

### Pitfall 15: Política documentada e não implementada — o padrão que este repositório já exibe três vezes

**What goes wrong:**
Escrever a política num documento, criar a tabela de auditoria, e nunca ligar o job. O sistema passa a ter **evidência escrita de que sabia da obrigação e não a cumpriu** — pior, para fins de responsabilização, do que nunca ter documentado.

Não é hipotético:
- `data_deletion_log` existe desde `20260609000001` com *"the Art.18 `delete_candidate_data()` function itself is **deferred to Phase 15**"*. A Phase 15 passou. A função nunca existiu.
- `limpar_logs_antigos()` em `docs/sql/sql/01-setup-inicial.sql:88`, com `cron.schedule` **comentado** na linha 103.
- `notificacoes_enviadas` com *"Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8)"*.

**How to avoid:**
- Inverter o padrão: **não criar tabela/coluna/documento de compliance sem o consumidor na mesma fase.** Se a retenção de `notificacoes_enviadas` não couber no M8, ela não deve ser *documentada como se fosse* — deve ser registrada como risco aceito, com dono e data, no backlog.
- **Limpar os artefatos zumbis como deliverable explícito**: ou `data_deletion_log` passa a receber escritas reais (recomendado — a tabela é boa e já tem RLS admin-only), ou o comentário mentiroso é corrigido. `limpar_logs_antigos()` idem.
- Check de fim de milestone: para cada afirmação de retenção/exclusão em comentário de migration ou doc, **existe código que a executa?**

**Warning signs:**
- Um `COMMENT ON TABLE` que promete comportamento futuro.
- A palavra "deferred" numa migration de compliance.

**Phase to address:** **F42** (levantamento) → **F47** (verificação).
**Confidence:** HIGH (verificado no repositório).

---

### Pitfall 16: O caminho de escrita fora do repositório — uma arma carregada apontada para a purga

**What goes wrong:**
O PROJECT.md registra "drift PROD→repo de causa desconhecida". O FK-AUDIT-LIVE **identificou uma das causas** (`ADD COLUMN IF NOT EXISTS` silenciando a cláusula FK) — o que é ótimo, mas também prova que o drift é real e que **o repositório descreve um banco que não existe** em pelo menos um ponto crítico.

Para features normais isso é higiene. Para **purga automática** é qualitativamente diferente: significa que existe (ou existiu) um caminho pelo qual DDL/DML chega a produção sem review, sem versionamento e sem ninguém saber. Um `cron.schedule` de purga criado por esse caminho, ou uma versão divergente do predicado, apaga dados sem rastro no repositório.

Agravante: o workaround documentado no CLAUDE.md (colar SQL no SQL Editor por causa do 42601 em corpos PL/pgSQL) **é um caminho de escrita manual legítimo e frequente** — e a purga será, quase certamente, PL/pgSQL. **O código mais perigoso do projeto será aplicado pelo caminho menos verificado do projeto.**

**How to avoid:**
- **Antes da fase de purga**: inventariar `SELECT * FROM cron.job` em PROD e diffar contra os `cron.schedule` do repositório. Qualquer job não explicado é achado **bloqueante**.
- Idem para triggers e funções: dump de schema de PROD vs. estado esperado. O projeto já provou saber fazer isso (P32, "dump PROD byte-a-byte").
- Para SQL aplicado manualmente via MCP/SQL Editor: **o texto aplicado tem que ser byte-idêntico ao arquivo de migration versionado**, verificado por hash, com `migration repair` na sequência. Não "equivalente" — **idêntico**.
- Varrer todas as migrations em busca de `ADD COLUMN IF NOT EXISTS` (e `CREATE ... IF NOT EXISTS` sobre objetos legados) — o mesmo idioma pode ter silenciado outras cláusulas.
- Considerar `REVOKE` de escrita em `cron.job` para roles que não precisam.

**Warning signs:**
- `count(*)` de `cron.job` em PROD ≠ número de `cron.schedule` no repositório.
- Alguém aplica SQL de purga "com um ajustezinho" direto no SQL Editor.

**Phase to address:** **F42**, como gate de entrada — é rápido e fecha um risco desproporcional.
**Confidence:** HIGH (débito documentado + causa identificada ao vivo).

---

### Pitfall 17: A disciplina de verificação que este time especificamente precisa — a lição da P39 aplicada a dados irreversíveis

**What goes wrong:**
A P39 fechou sem VERIFICATION.md e sem code review, e dois defeitos **CRÍTICOS** chegaram a produção (todo aprovado receberia a cópia de rejeição; o survivor-guard era dead code). **Cada camada aplicada depois achou algo que a anterior não pegou**: o review achou CR-01/CR-02; o UAT ao vivo achou W-01 (preheader não ramificado), invisível às asserções que olhavam só texto visível. Some-se o `.husky/pre-commit` permanentemente vermelho (baseline de 97 erros tsc), que treina `--no-verify` reflexo.

A assimetria que importa: num milestone de feature, uma camada faltante custa um bug e retrabalho. Num milestone de exclusão irreversível, custa **dados que não voltam** — e a janela de backup é de 7 dias. A P39 demonstrou empiricamente que **nenhuma camada isolada é suficiente neste time**: não por incompetência, mas porque cada camada tem um ponto cego diferente.

**How to avoid — gates que este milestone precisa e um milestone normal não:**

| Gate | Por que aqui e não sempre |
|------|---------------------------|
| **VERIFICATION.md obrigatório, sem exceção, em toda fase que escreva DELETE/UPDATE destrutivo** | A P39 provou que "a fase é simples" não é justificativa válida |
| **Code review obrigatório e bloqueante** nas fases de purga/exclusão/export | Foi a camada pulada na P39; e o export é a superfície de vazamento nº 1 |
| **Prova por execução** num Postgres descartável com dump com forma de PROD, diffando contagens | Ler o SQL não revela quantas linhas o predicado pega. O padrão já existe (P37) |
| **Asserção sobre o que NÃO aconteceu** (zero e-mails; zero linhas removidas em `historico_candidatura`/`decisao_final`/`bias_audit_log`; zero chaves novas no export) | W-01 escapou porque as asserções só olhavam o visível. Aqui o dano é sempre invisível |
| **Checkpoint de orquestrador para ligar o modo real**, com evidência anexada | Subagentes GSD não têm MCP Supabase, então já é checkpoint de fato — falta torná-lo explícito, com dry-run history como pré-requisito |
| **Dump manual antes do primeiro run real**, com data de descarte | 7 dias não é rede suficiente, e Storage não tem rede nenhuma |
| **`--no-verify` proibido em fase destrutiva** | O baseline vermelho do husky torna o bypass reflexo. Se o baseline não puder ser consertado, exigir `npm run lint` + `test:run` verdes **registrados na PLAN** antes do commit destrutivo |
| **Two-person review da política de retenção** (o número, não o código) | O predicado pode estar perfeito e a janela estar errada. São erros independentes |

**Warning signs:**
- Uma fase que toca DELETE fecha sem VERIFICATION.md.
- Um commit em fase destrutiva com `--no-verify`.
- O plano de teste verifica que o dado certo sumiu, mas nunca que o dado errado sobreviveu.

**Phase to address:** **Transversal** — codificar no ROADMAP como critério de saída de **toda** fase do M8, não como uma fase.
**Confidence:** HIGH (histórico documentado do projeto).

---

## Onde a PII se esconde neste sistema — inventário de partida

Esqueleto para o inventário da F42. **Não é o inventário** — é o que ele precisa preencher e conferir contra `database.types.ts` (~60 tabelas), coluna a coluna. A coluna "sobrevive?" usa o grafo real do FK-AUDIT-LIVE.

| Local | O que contém | Sobrevive a um `DELETE FROM candidaturas`/`candidatos` ingênuo? |
|-------|--------------|------------------------------------------------------------------|
| `auth.users` | e-mail, telefone, metadata | **Sim** — schema separado, fora do `database.types.ts` |
| Storage `curriculos` | PDF: nome, endereço, telefone, histórico profissional, foto | **Sim** — CASCADE de FK não alcança Storage |
| Storage (avatares RH / outros) | fotos | **Sim** — débito IN-01 já registrado |
| `ai_call_logs` | prompt/resposta — potencialmente o CV inteiro | **Sim** — FK `SET NULL` |
| `candidate_ai_decisions` | decisões derivadas | **Sim** — FK `SET NULL` |
| `logs_acesso` | IP, user agent, user_id | **Sim** — FK `SET NULL` |
| `recruiter_alerts` | referência ao candidato | **Sim** — FK `SET NULL` |
| `autorizacoes` | consentimentos | Parcial — `user_id` é `SET NULL`, mas `candidato_id` é CASCADE |
| `historico_candidatura` | append-only; `ator` = o próprio candidato; timestamps reidentificam | **Bloqueia** (`NO ACTION`) — deve sobreviver, **anonimizado** |
| `decisao_final` / `decisao_final_historico` | justificativa em texto livre (pode citar o nome) | **Bloqueia** (`NO ACTION`) — deve sobreviver, **com a justificativa tratada** |
| `bias_audit_log` | agregados demográficos, série longitudinal | Deve sobreviver — purgar quebra a auditoria EEOC 4/5 |
| `notificacoes_enviadas` | `destinatario_email` + `destinatario_original`, ambos `NOT NULL` | **Não** — CASCADE. Isso **destrói a idempotência** (Pitfall 6) |
| `respostas_*`, `scores_*`, `cognitivo_respostas` | perfil psicométrico = dado sensível de personalidade | Não — CASCADE (correto) |
| `redacoes_candidato` | prosa autobiográfica autoidentificante | Não — CASCADE (correto) |
| `entrevista_analises`, `entrevista_guias` | transcrição, citações do candidato | Não — CASCADE (correto) |
| `analise_candidato_vaga` | resumo do CV gerado por IA = paráfrase do documento | Não — CASCADE (**conferir**) |
| `devolutivas_candidato` | devolutiva Big Five personalizada | Conferir |
| `agendamentos_entrevista` | `observacoes_rh` (dado sobre o candidato, escrito por terceiro) | Conferir |
| `logs_auditoria` / `historico_acoes` / `log_auditoria` | **três** tabelas de log adicionais além de `logs_acesso` | Conferir — ninguém lembra que são quatro |
| `sessoes_ativas` | sessão + device | Conferir |
| `webhooks_logs` | payloads que podem conter PII | Conferir |
| `preferencias_notificacoes` | achado incidental — pode já ter estrutura de opt-out | Inspecionar antes de projetar |
| Backups Supabase (7 dias Pro) | tudo | **Sim** — inevitável; precisa ser **declarado** ao titular |
| Resend (processador) | conteúdo ~30d, logs ~90d | **Sim** — fora do seu controle; declarar na política |
| PDFs de comparativo gerados (M2) | dossiê consolidado | Conferir se persistidos |
| `sessionStorage` do navegador | rascunho do form de cadastro | Client-side — fora de escopo, mas vale nota |

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-delete direto, sem soft-delete + janela de graça | Uma fase a menos; código mais simples | Pedido feito por engano (ou bug de predicado) é irreversível fora dos 7 dias — e Storage não tem janela nenhuma | **Nunca** neste milestone |
| Trocar uma das 3 FKs `NO ACTION` por CASCADE para "destravar" o 23503 | O DELETE passa a funcionar | Destrói a trilha de auditoria que é a única prova de que o humano decidiu (RNF-07a) | **Nunca** |
| Deixar o CASCADE de `notificacoes_enviadas` como está | Nada a fazer | Apagar candidatura destrói `UNIQUE(dedupe_key)` → reenvio pela varredura da P41 | Nunca — anonimizar antes, ou trocar para `SET NULL` |
| Um `select('*')` no export "porque é o dado do próprio titular" | Export pronto em 1h | Vaza `motivo_rejeicao`, `rubric`, `observacoes_rh`, dados de terceiros. Reincidência nº 1 do codebase (P8, P24) | Nunca |
| Ligar o cron real junto com o merge do código | Uma etapa a menos | O primeiro run real acontece sem histórico de dry-run; o predicado errado só é descoberto depois | Nunca |
| Tratar `autorizacao_retencao_curriculo = true` como consentimento válido para linhas antigas | Dispensa a coluna de versão | Base legal frágil sob toda a política; e a distinção pré/pós-enforcement fica impossível depois | Só se a política **conservadora** for aplicada a todas as linhas antigas |
| Adiar de novo a retenção do ledger de e-mail | Fase mais curta | Terceiro adiamento consecutivo do mesmo item; o COMMENT vira theater documentado | Aceitável **se** registrado como risco com dono e data — não como "deferred" em COMMENT |
| Anonimizar hasheando e-mail sem salt | Uma linha de SQL | Pseudonimização reversível — o erro nº 1 dos controladores segundo o EDPB | Nunca — HMAC com chave do Vault (`pgcrypto` já instalado) |
| `--no-verify` porque o husky está vermelho | O commit sai | Em fase destrutiva, remove a última barreira automática antes de código que apaga dados | Nunca em fase que toque DELETE/UPDATE destrutivo |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Supabase Storage** | `DELETE FROM storage.objects`, ou confiar em `ON DELETE CASCADE` | Storage API (`.remove()`) via EF, **antes** de apagar as linhas que guardam os paths; verificar o retorno. Deletar a linha via SQL órfana o arquivo de forma **irrecuperável** |
| **Supabase Auth** | `deleteUser` primeiro (cascateia e/ou 23503), ou nunca (e-mail vivo) | `deleteUser` **por último**, na ordem canônica; `shouldSoftDelete: true` na janela de graça; desreferenciar `historico_candidatura.ator` antes |
| **Supabase backups/PITR** | "Restauramos se der errado" | Pro puro = 7 dias de backup diário; PITR é add-on pago (7–28d); restore é projeto inteiro com downtime; **Storage não é restaurado** |
| **`pg_constraint` vs. migrations** | Derivar o grafo de FK dos arquivos `.sql` | Os arquivos mentem (`ADD COLUMN IF NOT EXISTS` silenciou uma FK). Consultar `pg_constraint` ao vivo — `FK-AUDIT-LIVE.md` tem a consulta |
| **pg_cron** | Agendar e assumir que roda | Heartbeat + linha em `data_deletion_log` por execução + monitorar `cron.job_run_details WHERE status='failed'`; kill switch lido em runtime |
| **pg_net (`net.http_post`)** | Assumir entrega | At-most-once, fire-and-forget; falha descartada em silêncio. Nunca como caminho único de algo que precise acontecer |
| **Resend** | Achar que apagar do banco apaga do provedor | Conteúdo ~30d / logs ~90d retidos pelo processador; declarar na política; pedido via DPA; desligar click tracking (já no escopo do M8) |
| **Pipeline COMM (trigger→EF)** | Suppression check no trigger | Checar **no ponto de envio**, dentro da EF, imediatamente antes da chamada ao provedor — a corrida com a exclusão acontece depois do trigger |
| **`dedupe_key` do ledger** | Preservá-la intacta na anonimização | Regravar com discriminador de purga; senão bloqueia silenciosamente envios legítimos futuros (recandidatura) |
| **PostgreSQL Anonymizer (`anon`)** | Planejar em cima dele | **Não está disponível** neste projeto (ausente de `pg_available_extensions`). Primitivo = `UPDATE` de tombstone via RPC `SECURITY DEFINER` |
| **Migrations PL/pgSQL via SQL Editor** | Aplicar "equivalente" ao arquivo | Byte-idêntico, verificado por hash, + `migration repair`. A purga é PL/pgSQL e vai pelo caminho menos verificado |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Colunas filhas de FK sem índice + CASCADE | O primeiro run demora horas ou estoura o timeout do pooler; o job aparece "failed" e nada (ou parte) foi apagado | Postgres **não** indexa a coluna filha de uma FK automaticamente; cada linha do pai vira seq scan no filho. Com **25 FKs CASCADE** apontando para `candidaturas`, isso é 25 varreduras por linha. Auditar e indexar antes | Já no primeiro backfill histórico |
| Purga não-batelada numa única transação | Transação longa segura locks, incha WAL, estoura o transaction pooler | Loop com `LIMIT n` **usando o mesmo predicado a cada iteração** e commit por lote, com log por lote | Primeiro backfill |
| Batelamento com `OFFSET` | Linhas silenciosamente puladas — não sobra erro, sobra PII | `DELETE ... WHERE id IN (SELECT id FROM v_purgaveis LIMIT n)` em loop até `ROW_COUNT = 0`. Com `OFFSET`, a janela desliza sob os pés | Sempre; o sintoma é invisível |
| Export montando o dossiê inteiro em memória na EF | Timeout/OOM em candidatos com muitas candidaturas | Limitar escopo, streamar, ou gerar assíncrono e avisar por e-mail quando pronto (o pipeline COMM já existe) | Histórico longo — raro hoje, previsível |
| Fila Art. 20 com N+1 para calcular SLA | Tela lenta → RH abandona a fila (Pitfall 11.1) | Calcular SLA em SQL/view; reusar o padrão `v_fila_trabalho` do M6 | Poucas dezenas de pedidos |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Export com `service_role` e `select('*')` | RLS não protege nada nesse contexto; vaza gabarito, `rubric`, critério de rejeição (viola D-15), `observacoes_rh`, dados de terceiros | Allowlist declarativa versionada + snapshot de chaves + code review bloqueante |
| Endpoint de exclusão sem verificação de identidade forte | Exclusão maliciosa de conta alheia = destruição **irreversível** dos dados de um terceiro | Re-autenticação recente (padrão GoTrue do M5/A37) + confirmação explícita + janela de graça reversível |
| Endpoint de export sem verificação de identidade forte | Divulgação de PII à pessoa errada — incidente de segurança em si, com dever de notificação | Mesma re-autenticação; link com expiração curta (padrão da EF `get-curriculo-url`, P32) |
| RPC de purga sem `SET search_path = ''` | Hijack de search_path numa função `SECURITY DEFINER` **que apaga dados** | Padrão já estabelecido no projeto — aplicar sem exceção |
| Fila Art. 20 legível por qualquer RH | O pedido carrega justificativa de rejeição e dados do candidato | RLS vaga-scoped join-through, padrão WR-04 já provado (P32/P37) |
| Anonimização com hash sem salt | Reversível por dicionário; não satisfaz o direito ao apagamento | HMAC com chave no Vault; chave destruída ao fim da retenção |
| `data_deletion_log` guardando `candidato_id` | O log de exclusão vira o índice do que foi excluído — reidentifica | O PRD original já previa "sem candidato_id". Guardar hash, contagens e paths — nunca identidade |
| Dump manual pré-purga esquecido num laptop | Shadow database de PII sem RLS, sem retenção, sem controle | Data de descarte definida no ato da criação e registrada na PLAN |
| Cron de purga criado fora do repositório | DELETE em produção sem review nem rastro | Diff `cron.job` PROD × repositório como gate; `REVOKE` de escrita em `cron.job` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Confirmação que promete "todos os dados" | Declaração falsa por escrito, anexável a reclamação na ANPD | Copy derivada do mapa de 3 categorias; nomear auditoria anonimizada + janela de backup |
| Exclusão imediata, sem confirmação nem graça | Um clique acidental destrói o histórico de forma irreversível | Confirmação com digitação + janela de graça de N dias + e-mail "seus dados serão excluídos em N dias — cancelar" + reversibilidade real nessa janela |
| Countdown de 15 dias exibido ao candidato | Vira promessa citável; um dia de atraso vira evidência de descumprimento | O M7 já fixou a disciplina (estimativa, nunca countdown). Aqui: informar o **direito** e o prazo legal; o relógio duro vive dentro (escalonamento interno) |
| Rejeição de pedido sem motivo | O titular não sabe o que fazer; escala para a ANPD | Resposta fundamentada com a base legal da retenção — o direito ao apagamento tem exceções legítimas, e a defesa está em explicá-las |
| `revisao_resultado` como texto sem efeito visível | O candidato recebe resposta que não muda nada — teatro percebido como teatro | Resultado com estado (mantida/reformada) + efeito real no funil + notificação pelo COMM |
| Fila Art. 20 sem estado "em análise" | O candidato clica, nada acontece por dias, ele reclica ou reclama | Estado visível no painel desde o clique + e-mail de confirmação de recebimento (pipeline já existe) |
| Purga sem aviso prévio | O candidato perde o acompanhamento sem entender | E-mail "seus dados serão excluídos em N dias" com opção de renovar consentimento — vira também o mecanismo de renovação de retenção |
| Exclusão que também apaga a conta de acesso sem avisar | Candidato descobre que perdeu o login ao tentar entrar | Deixar explícito na confirmação que a conta deixa de existir e que uma nova candidatura exigirá novo cadastro |

---

## "Looks Done But Isn't" Checklist

- [ ] **Exclusão:** falta o objeto no Storage — listar o bucket `curriculos` pelo prefixo do `auth.uid()` **após** a exclusão e confirmar zero objetos
- [ ] **Exclusão:** falta `auth.users` — verificar que o login falha e que o recadastro com o mesmo e-mail funciona
- [ ] **Exclusão:** faltam as **5 tabelas `SET NULL`** (`ai_call_logs`, `candidate_ai_decisions`, `logs_acesso`, `recruiter_alerts`, `autorizacoes`) — sobrevivem por padrão a qualquer CASCADE
- [ ] **Exclusão:** faltam as **4** tabelas de log (`logs_acesso`, `logs_auditoria`, `historico_acoes`, `log_auditoria`) e `sessoes_ativas`
- [ ] **Exclusão:** faltam os artefatos de IA — `analise_candidato_vaga`, `entrevista_analises`, `devolutivas_candidato`, corpo de `ai_call_logs`
- [ ] **Exclusão:** verificar contagem **INALTERADA** em `historico_candidatura`, `decisao_final`, `decisao_final_historico`, `bias_audit_log`
- [ ] **Exclusão:** verificar que o ledger foi **anonimizado**, não apagado pelo CASCADE de `candidatura_id`
- [ ] **Purga:** existe ≥1 linha `modo='dry_run'` em `data_deletion_log` **antes** do primeiro run real
- [ ] **Purga:** o kill switch desliga o job **sem migration** — testar de verdade, não ler o código
- [ ] **Purga:** candidatura com `data_decisao IS NULL` e candidatura em etapa ativa **não** são selecionadas pela view
- [ ] **Purga:** o cap de blast radius aborta — **forçar o cenário**, não confiar no `IF`
- [ ] **Art. 20:** quantos pedidos **já existem em PROD hoje**, e todos foram respondidos?
- [ ] **Art. 20:** a conta que gravou `decisao_final.por_usuario` **não consegue** registrar a revisão
- [ ] **Art. 20:** a revisão consegue efetivamente mudar o estado da candidatura, não só escrever texto
- [ ] **Export:** conferido coluna a coluna contra a lista protegida por REVOKE na P24; `motivo_rejeicao`, `rubric`, `observacoes_rh` ausentes
- [ ] **Export:** adicionar coluna nova ao banco **não** a faz aparecer no export (teste de snapshot)
- [ ] **E-mail:** excluir candidato com notificação pendente → **zero** e-mails e status terminal no ledger
- [ ] **E-mail:** candidato anonimizado que se recandidata **recebe** a confirmação (a `dedupe_key` não bloqueou)
- [ ] **Consentimentos:** os checkboxes **não** vêm pré-marcados
- [ ] **Consentimentos:** candidatos pré-enforcement são distinguíveis por **coluna**, não por inferência
- [ ] **Consentimentos:** `preferencias_notificacoes` foi inspecionada antes de criar estrutura nova
- [ ] **Compliance zumbi:** `data_deletion_log` recebe escritas reais; o COMMENT de `notificacoes_enviadas` reflete o que o código faz; `limpar_logs_antigos()` foi resolvida
- [ ] **Drift:** `cron.job` de PROD bate com o repositório; `ADD COLUMN IF NOT EXISTS` varrido em todas as migrations

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Predicado errado apagou demais, **dentro** de 7 dias | HIGH | Restore de projeto inteiro (downtime + perda do que veio depois) ou PITR se contratado; **Storage não volta**. Preferível: extrair tabelas do dump manual e reinserir seletivamente |
| Predicado errado apagou demais, **fora** de 7 dias | **IRRECUPERÁVEL** | Não há recuperação. Restam notificação de incidente, avaliação de comunicação à ANPD, e reconstrução parcial a partir de derivados sobreviventes |
| Objetos de Storage órfãos por `DELETE FROM storage.objects` | **IRRECUPERÁVEL** (o objeto fica, sem forma suportada de apagar) | Só o caminho S3 direto (fora do Supabase) ou migração de bucket. Prevenção é a única estratégia |
| CV apagado do Storage por engano | **IRRECUPERÁVEL** | Backups não cobrem Storage. Prevenção: prefixo `_pending_purge/` durante a graça |
| CASCADE apagou `historico_candidatura`/`decisao_final` | HIGH → IRRECUPERÁVEL fora de 7 dias | É a perda da evidência de decisão humana. Restore parcial; e reavaliar se a auditoria de viés ainda é válida |
| Ledger apagado pelo CASCADE → reenvio em massa | MEDIUM | Desligar o cron `*/15` (kill switch), marcar linhas afetadas como terminais, reconstruir idempotência a partir do webhook Svix (`provider_message_id`) |
| E-mail enviado a titular excluído | MEDIUM | Registrar incidente, responder ao titular, corrigir o suppression gate. O dano legal/reputacional já ocorreu |
| Export vazou colunas protegidas | HIGH | Avaliar dever de notificação; corrigir a allowlist; auditar quem baixou — **o log de export é essencial e precisa existir desde o início** |
| Fila Art. 20 estourou os 15 dias | MEDIUM | Responder imediatamente reconhecendo o atraso; documentar a causa; ligar o escalonamento. O passivo já existente em PROD se enquadra aqui |
| Cron parou sem ninguém notar | LOW | Religar e rodar o backfill **com o cap de blast radius em override consciente**, nunca silenciosamente |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 — Backup como rede inexistente | **F42** (gate) | Artefato datado: PITR on/off + janela em dias |
| 2 — Predicado de retenção errado | **F45** | Fixtures com `NULL`, fronteira ±1s, etapa ativa; view canônica única |
| 3 — CASCADE apagando evidência | **F42** (3 categorias, a partir do FK-AUDIT-LIVE) → **F44** | Teste assertando contagem inalterada nas 4 tabelas de auditoria; nenhuma FK `NO ACTION` virou CASCADE |
| 4 — Storage órfão | **F44** | Prefixo do bucket pós-exclusão = 0 objetos; grep-guard contra `DELETE FROM storage.objects` |
| 5 — `auth.users` / 5 tabelas `SET NULL` | **F44** | Login pós-exclusão falha; recadastro funciona; as 5 tabelas `SET NULL` tratadas |
| 6 — Ledger guarda o e-mail (`NOT NULL` ×2, CASCADE) | **F44** + **F45** | Anonimização não viola `NOT NULL`; `dedupe_key` sobrevive; CASCADE não apagou o ledger |
| 7 — Retry reenvia; dedupe bloqueia | **F44** (seam com o COMM/M7) | Exclusão concorrente → 0 e-mails; recandidatura pós-anonimização → e-mail enviado |
| 8 — Anonimização reversível | **F42** (inventário) → **F44** | Teste de reidentificação por quase-identificadores; texto livre e IA hard-deletados |
| 9 — Export vaza | **F44** | Snapshot de chaves + code review bloqueante + grep `select('*')` |
| 10 — Confirmação que mente | **F44** | UAT conferindo a copy frase a frase contra o mapa de 3 categorias |
| 11 — Fila Art. 20 teatral | **F43** (cedo — prazo legal correndo) | Passivo de PROD respondido; constraint revisor ≠ decisor; revisão muda estado real |
| 12 — `pg_cron` silencioso | **F45** | Linha em `data_deletion_log` por execução; dead-man switch; kill switch testado; cap forçado |
| 13 — Dry-run nunca exercido | **F45** | ≥N execuções `modo='dry_run'` em PROD; um só predicado; ligar o real = checkpoint de orquestrador |
| 14 — Consentimento pré-marcado | **F46** (defaults + coluna de versão antecipados p/ **F42**) | Checkbox não pré-marcado; coluna de versão existe; política conservadora p/ pré-enforcement |
| 15 — Compliance zumbi | **F42** → **F47** | Cada afirmação de retenção em comentário/doc tem código que a executa |
| 16 — Write path fora do repo | **F42** (gate) | `cron.job` PROD diffado; `ADD COLUMN IF NOT EXISTS` varrido |
| 17 — Disciplina de verificação | **Transversal** (critério de saída de toda fase do M8) | VERIFICATION.md + code review em toda fase destrutiva; asserções sobre o que NÃO aconteceu; zero `--no-verify` |

### Ordem recomendada — e por quê

1. **F42 primeiro, sem uma única linha de código destrutivo.** Inventário de PII coluna a coluna, classificação em 3 categorias (partindo do FK-AUDIT-LIVE), verificação de PITR, diff de `cron.job`, varredura de `ADD COLUMN IF NOT EXISTS`, desmarcar os defaults de consentimento + coluna de versão. Barato, sem risco, e **desbloqueia tudo o mais**. Nada abaixo é desenhável sem isso.
2. **F43 (Art. 20) antes da purga.** É a única lacuna com **prazo legal correndo hoje**, não tem risco de destruição de dados, e reusa o pipeline COMM já provado em produção. Máximo valor de conformidade com mínimo risco — e serve de aquecimento do time no domínio.
3. **F44 (Exclusão + Portabilidade) antes da purga automática.** A exclusão manual é **o mesmo motor** da purga, mas disparada por uma pessoa, uma vez, sob observação: é o dry-run natural do motor de purga. Construir a purga automática antes é automatizar um motor nunca exercitado.
4. **F45 (Retenção/Purga) por último entre as destrutivas**, com dry-run rodando em PROD por semanas antes do modo real, e o "ligar" como checkpoint separado.
5. **F46 (Consentimentos)** pode paralelizar — exceto o desmarcar defaults + coluna de versão, que vai para F42 porque o passivo cresce a cada cadastro novo.
6. **F47 (Consolidação)** — cobertura Nyquist das 6 fases sem veredito + W-1, mais o check de "compliance zumbi" do Pitfall 15.

---

## Sources

**Documentação oficial (MEDIUM — Context7 sobre docs Supabase + fetch direto):**
- Backups & PITR: Pro 7 dias, PITR add-on 7–28 dias, RPO 2 min, restore projeto-inteiro com downtime, **Storage não incluído** — https://supabase.com/docs/guides/platform/backups
- Cascade deletes — https://supabase.com/docs/guides/database/postgres/cascade-deletes
- `auth.admin.deleteUser(id, shouldSoftDelete)` — https://supabase.com/docs/reference/javascript/auth-admin-createuser
- Delete objects (Storage) — https://supabase.com/docs/guides/storage/management/delete-objects
- pg_cron debugging guide (`cron.job_run_details`) — https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz

**Discussões oficiais Supabase — órfãos de Storage (MEDIUM, múltiplas fontes convergentes):**
- https://github.com/orgs/supabase/discussions/3124 · https://github.com/orgs/supabase/discussions/26278 · https://github.com/orgs/supabase/discussions/34254

**LGPD / regulatório (MEDIUM — fontes secundárias brasileiras convergentes):**
- Art. 20 e prazos — https://confidata.com.br/blog/lgpd-comentada-13-prazos-decisoes-automatizadas
- Crítica à revisão meramente formal — https://blog.idp.edu.br/direito-digital/artigo-20-lgpd-revisao-decisoes-automatizadas/
- Texto do Art. 20 — https://lgpd-brasil.info/capitulo_03/artigo_20
- Prazo de resposta ao titular — https://www.gov.br/mec/pt-br/acesso-a-informacao/perguntas-frequentes/privacidade-e-protecao-de-dados-pessoais/qual-o-prazo-para-que
- Retenção de currículos no Brasil (6–12 meses / 2 anos / debate dos 5 anos prescricionais; CV de não contratado deve ser descartado salvo consentimento p/ banco de talentos) — https://linkvagas.com.br/blog/ver/116/lgpd-no-recrutamento-sua-empresa-pode-guardar-curriculos-por-quanto-tempo · https://www.migalhas.com.br/depeso/363808/o-tratamento-dos-curriculos-na-lgpd · https://www.conjur.com.br/2020-set-24/pratica-trabalhista-adequacao-lgpd-recrutamento-selecao-candidatos-emprego/

**Direito ao apagamento — falhas observadas por autoridades (MEDIUM):**
- Relatório EDPB: pseudonimização tratada como anonimização; desativação tratada como apagamento; controladores que não encontram os dados — https://jetico.com/blog/what-the-edpbs-right-to-erasure-report-reveals-about-where-organizations-still-struggle/ · https://www.mlex.com/mlex/data-privacy-security/articles/2442880/
- Backups × right to be forgotten — https://www.sciencedirect.com/science/article/abs/pii/S0267364918301389 · https://severalnines.com/blog/gdpr-and-database-backups/
- Reter o registro sem o dado pessoal (accountability) — https://axiom.co/blog/the-right-to-be-forgotten-vs-audit-trail-mandates
- Erasure em ATS — https://treegarden.io/blog/gdpr-right-to-erasure-ats/

**DSAR / operação (MEDIUM):**
- Pitfalls de workflow, SLA, verificação de identidade, over-disclosure — https://www.privacyculture.com/news-article/105/5-common-pitfalls-and-how-to-avoid-them · https://mrhaseeb.com/blog/dsar-workflow-design-for-small-saas-without-legalops · https://www.dpocentre.com/blog/dsar-identity-verification-guide/

**Purga / jobs destrutivos (MEDIUM):**
- Dry-run, cap de % de linhas, logging de rows-processed — https://www.cronwizard.com/best-practices · http://docs.pipelinefx.com/display/QUBE/Clean+Up+Old+Jobs+Automatically · https://adhorn.medium.com/i-deleted-a-production-database-268eace81521
- Perigos de CASCADE — https://www.dbvis.com/thetable/postgres-on-delete-cascade-a-guide/

**Retenção do provedor de e-mail (MEDIUM):**
- https://github.com/resend/resend-skills/blob/main/skills/email-best-practices/references/list-management.md · https://resend.com/docs/knowledge-base/why-are-my-emails-landing-on-the-suppression-list

**Estado vivo de PROD (HIGH):**
- `.planning/research/FK-AUDIT-LIVE.md` — grafo de FK via `pg_constraint`, drift `candidatos.user_id`, 3 FKs `NO ACTION`, 25 CASCADE, 5 `SET NULL`, `anon` indisponível, extensões instaladas

**Codebase deste projeto (HIGH — leitura direta):**
- `src/features/cadastro/components/steps/AutorizacoesStep.tsx:55-74` — 4 consentimentos; copy "por até 2 anos"
- `src/features/cadastro/schemas/candidatoSchema.ts:354-363` + `CadastroMultiStepForm.tsx:245-247` — defaults pré-marcados
- `supabase/migrations/20260609000001_prompt_library_schema.sql:311-333` — `data_deletion_log` + `delete_candidate_data` "deferred to Phase 15", nunca implementada
- `supabase/migrations/20260721000001_notificacoes_enviadas.sql:81,84,92,144,149` — `destinatario_email NOT NULL`, `UNIQUE(dedupe_key)`, "Retention INDEFINITE"
- `supabase/migrations/20260722000002_p37_notificacoes_lacunas.sql:100` — `destinatario_original NOT NULL` sem default
- `supabase/migrations/20260727000001_p41_recon_retry.sql:223` — varredura de retry `pg_cron`
- `docs/sql/sql/01-setup-inicial.sql:88-103` — `limpar_logs_antigos()` com `cron.schedule` comentado
- `.planning/PROJECT.md` — lição P39, hábito `--no-verify`, drift PROD→repo

---
*Pitfalls research for: LGPD-OPS em ATS live com PII real (Supabase)*
*Researched: 2026-07-29*
