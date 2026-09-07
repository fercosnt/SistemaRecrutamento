# Retomar aqui — estado em 2026-09-06, fim da sessão da conferência

**Como abrir a próxima conversa:**

> *"Leia `.planning/RETOMAR-AQUI.md` e `.planning/GUIA-VALIDACAO-FINAL.md` §7, e vamos continuar"*

Este arquivo é o resumo executivo e a lista do que falta. O guia
(`GUIA-VALIDACAO-FINAL.md`) é o documento longo: §0–§6 é o plano de teste, §7.1–§7.28 é o
**diário do que foi medido**, com o resultado de cada item e o commit de cada conserto.

**Três sessões estão registradas aqui:** a de **validação** (2026-09-05/06, 47 commits,
19 defeitos), a dos **vereditos** (2026-09-06, 6 commits, as 3 decisões de produto) e a da
**conferência** (2026-09-06, §7.27 — que achou os vereditos parados no disco local).

---

## Em uma frase

O funil inteiro do candidato foi percorrido de ponta a ponta em PROD com contas reais;
19 defeitos foram encontrados e consertados; as 3 decisões de produto foram tomadas,
implementadas, **publicadas em produção e conferidas na tela** (§7.27); e o **bloco E fechou
inteiro** com o E10 (§7.28). O que resta são os blocos **G e H** (que são seus por natureza) e a
**limpeza** dos dados de teste antes de divulgar as vagas.

⚠ **A conferência achou que os três vereditos nunca tinham sido publicados** — commitados e
não enviados, enquanto a migration, aplicada por fora do git, já estava em PROD. Push feito
(`e4a1cfbd..1330f40c`), deploy `READY`, e a decisão B verificada de ponta a ponta.

O M8 é o último milestone planejado. Fechando esses dois itens, o projeto está fechado como
está escopado hoje.

---

## 0 · O que fazer primeiro, nesta ordem

### 0.1 ✅ A decisão B — publicada e conferida na tela (§7.27)

Feito. Mas leia o **como**, porque a lição não é sobre a decisão B:

⛔ **Os três vereditos não estavam em produção.** Estavam commitados e **não enviados** (7
commits em `origin/main..HEAD`), enquanto a migration, aplicada por `p46apply.cjs` — que fala
direto com o Supabase e **não passa pelo git** —, já estava em PROD há horas. O banco andou, o
front ficou, e a versão anterior deste arquivo afirmava «está no ar» sobre as duas metades
porque tinha visto uma.

**Se o roteiro tivesse sido executado como escrito**, o cartão ausente teria sido lido como «o
conserto `12ec4e42` não funcionou» — diagnóstico falso sobre um commit correto que nunca rodou.

> ⭐ **Antes de investigar um conserto que «não funcionou», prove que ele está servido.**
> `git log origin/main..HEAD` e uma busca do marcador no bundle. Vale sempre que o apply do
> banco e o deploy do código saem por **canais diferentes** — que é o caso deste projeto.

Push feito (`e4a1cfbd..1330f40c`, com `vitest` 1980/1980 e build verde antes), deploy `READY`,
e os três marcadores conferidos **no chunk em que cada um mora** (A e C ficam em chunks lazy
de `/rh/*`; procurá-los no índice eager dá falso negativo).

**A conferência, na T3:** cartão aparece no knockout ✅ · texto diz «automaticamente, sem
avaliação de uma pessoa» e não vaza o critério ✅ · sem CTA de revisão, com
`lgpd@beautysmile.com.br` no lugar ✅ · e a rejeição de **decisão final** da mesma conta segue
com o texto humano e o CTA de revisão ✅.

**O passo 4 saiu mais forte que a tela.** Não existe rejeição humana de triagem em PROD, e a
expectativa escrita estava imprecisa: `rejeitar_candidatura` não grava `feedback_rejeicao` nem
`data_decisao_final`, então **o cartão nem aparece** (não é «leva a uma página vazia»). O
predicado foi exercitado no servidor, com a sessão real da T3: knockout próprio `true`;
rejeitada sem knockout **`false`**; knockout de outra pessoa `false`; id inexistente `false`.
Duas camadas independentes seguram, e os 6 valores do enum `motivo_rejeicao_rh` não colidem com
a string `'knockout_automatico'`. Detalhe em §7.27.

⚠ **A T2 não serve para este teste** (tem `encerrada_a_pedido_em` do §7.23 e o painel mostra
«Você retirou sua candidatura»); use a **T3**. E a rota de login é **`/auth/login`** — `/login`
é 404.

### 0.2 ✅ E10 fechado — o bloco E inteiro está fechado (§7.28)

Conta **RH3** criada por você; a resposta à revisão da T3 foi dada **pela tela**, como RH3,
sobre uma decisão de **RH2**. Medido nas sete pontas: fila, diálogo (com o aviso de que o
texto vai literal ao candidato), confirmação, gravação com as duas autorias distintas, trilha,
notificação **entregue** e a tela da candidata mostrando «a decisão foi mantida».

⛔ **A trilha rendeu um defeito novo:** `stamp_explicacao_acessada` é idempotente no **valor**
(`COALESCE`) e não na **escrita** — o `UPDATE` roda a cada visita e o trigger `AFTER UPDATE`
acrescenta uma linha ao histórico do Art. 20. Hoje: **7 linhas, 2 estados distintos**. Cresce
por ação do titular, e dilui justamente a trilha que o Art. 20 exige. Não consertado (é
migration em PROD); está no backlog do guia como **P2**, com o conserto e o portão escritos.

### 0.3 ⏳ Rodar os blocos G e H — são seus

**G** (`/admin/retencao`) mexe em política de dados. **H** (o flip da purga de `dry_run` para
`live`) é **irreversível** e é checkpoint de operador. Depois deles, a limpeza do bloco I
(§3.4) e as vagas podem ser divulgadas.

---

## 1 · O que está funcionando, medido e não lido

O funil completo foi percorrido com três contas de teste (`+claude1/2/3` no seu Gmail),
conferindo **cada resultado no banco e cada e-mail na caixa de entrada real** — nunca apenas
na tela.

| Bloco | Estado |
|---|---|
| Inscrição, triagem com IA, SJT, redação cultural | ✅ §7.8–7.11 |
| Agendamento, convite com `.ics`, reagendamento com aviso | ✅ §7.12, §7.17 |
| Guia de entrevista, análise de transcrição | ✅ §7.14, §7.25 |
| Decisão final com os 3 pesos, e-mail de aprovação | ✅ §7.20 |
| Knockout com e-mail, explicação e revisão do Art. 20 | ✅ §7.18, §7.21, §7.24, §7.26, §7.27 |
| Revisão do Art. 20 respondida por outra pessoa (E10) | ✅ §7.28 — bloco E fechado |
| Cópia de dados, exclusão com arrependimento | ✅ §7.22, §7.23 |
| Auditoria de viés, fila de pedidos de dados | ✅ §7.17, §7.24 |

**Suítes hoje:** `vitest` **1980/1980** (200 arquivos) · `tsc` **90** erros (baseline
congelada 96 — não subiu). O `deno test` ficou em **484/484 na sessão de validação** e **não
foi reexecutado** na dos vereditos, porque nenhuma Edge Function foi tocada — conferido por
`git diff --name-only` sobre `supabase/functions/`, não por memória.

⚠ Para reexecutá-lo neste ambiente é preciso um `deno install` antes: sem ele, a suíte aborta
em `npm:svix@1.99.1` no teste do `resend-webhook`. Não há `deno.json` nem script npm para ele.

**Commits:** 47 na sessão de validação (`a7fc5973`..`ecaa98e7`) + 6 na dos vereditos
(`7a245d6a`..`c9bf7457`). Todos **enviados** — `origin/main` está em dia desde 06/09 (§7.27).

---

## 2 · Os defeitos que valem lembrar (o padrão importa mais que a lista)

Cinco famílias explicam quase tudo o que foi encontrado nas três sessões. Elas vão se repetir.

**a) O score que ninguém escrevia.** Dos três pesos da decisão final, **dois nunca chegavam ao
consolidador**: a redação e a entrevista gravavam só nas suas tabelas próprias, e o consolidador
lê `scores_candidato`. Toda vaga calculava o agregado sobre um terço do que deveria — sem erro,
sem alarme. Achado porque se varreu os **três** pesos, e não só o que falhou. Migrations
`…0002` e `…0005` (com backfill). §7.16, §7.20.

**b) O cache que servia a resposta errada.** A chave de idempotência não cobria o input, depois
não cobria o schema. Clicar «Gerar guia» devolvia, em menos de um segundo e sem chamada nova, a
saída de 40 minutos antes — e, no vizinho, uma transcrição **nova** teria recebido a análise da
**anterior**, com as citações de outra conversa. Só ficou observável quando o replay passou a
funcionar: **consertar o cache ligou o defeito**. `a01321a8`, `7bc7ef2b`.

**c) A lista literal que envelhece.** O filtro `.eq('status','agendada')` quebrou no primeiro
reagendamento, com a mesma mensagem do defeito que resolvia. O gate de auditoria de viés pedia
o período do snapshot exibido. O login do RH esperava «existe papel» em vez de «existe papel
deste usuário». E o cartão LGPD do painel exigia a **etapa** quando o knockout preserva
`inscricao` por desenho. `6f26a25c`, `05530472`, `61f07508`, `12ec4e42`.

**d) ⭐ Duas causas indistinguíveis nas colunas que o cliente pode ler.** *(nova, §7.26)* A
rejeição **humana** da triagem e o knockout **automático** são a MESMA linha do lado do
candidato: as duas com `status='rejeitado'`, as duas sem `decisao_final`, e a allowlist do
cliente exclui `motivo_rejeicao` **de propósito** (D-15 — o critério nunca vaza). Inferir
«sem decisão e rejeitado ⇒ knockout» teria dado a uma rejeição **escrita por uma pessoa** o
texto «foi automático, nenhuma pessoa avaliou» — errado exatamente sobre o fato que a página
existe para contar. **A allowlist restritiva, que é uma decisão de privacidade correta, produz
de graça uma armadilha epistêmica no cliente.** Conserto: uma RPC `SECURITY DEFINER` que **lê**
a coluna sensível sem **devolvê-la** (retorna booleano).

**e) ⭐ O conserto correto que nunca foi servido.** *(nova, §7.27)* Os três vereditos estavam
commitados e não enviados, enquanto a migration deles — aplicada por `p46apply.cjs`, que fala
direto com o Supabase — já estava em PROD. **O apply do banco e o deploy do código saem por
canais diferentes neste projeto**, então «apliquei» e «publiquei» são fatos independentes que a
memória junta num só. O sintoma na tela (o cartão ausente) é **idêntico** ao de um conserto que
não funciona, e acusaria um commit correto. Antes de investigar, prove que está servido:
`git log origin/main..HEAD` e o marcador buscado no bundle — **no chunk certo**, porque rota
`/rh/*` vira chunk lazy e procurar no índice eager dá falso negativo.

> **A lição que atravessa as quatro:** quase todo defeito aqui era **silencioso**. Nenhum
> derrubava a tela; todos entregavam um resultado plausível. O que os revelou foi sempre
> comparar a tela com o banco, e nunca aceitar «a tela mostrou» como prova.
>
> E a (e) acrescenta o outro lado: o mesmo silêncio vale para a **procedência** do que você está
> olhando. «A tela mostrou o antigo» é indistinguível de «o conserto falhou» até você conferir
> qual build está no ar.

---

## 3 · O que falta — em ordem de importância

### 3.1 ✅ As três decisões — tomadas, implementadas e aplicadas (§7.26)

| | Veredito | Commit | Estado |
|---|---|---|---|
| **A** · a cópia entrega o que o recrutador escreve (§7.22) | manter a allowlist, **avisar os dois lados** | `5123ef04` | ✅ completo |
| **B** · explicação e revisão no knockout (§7.18) | **explicação sim, revisão não** (caminho 2) | `12ec4e42` + `cf4df6fc` | ✅ em PROD e **conferido na tela** (§7.27) |
| **C** · a geração do guia leva 60–130 s (§7.25) | **travar o botão e mostrar o tempo** | `7a245d6a` | ✅ completo |

**O que cada uma virou, em concreto:**

- **A** — `COPY_PEDIR_COPIA.oQueEsta` passa a nomear as anotações da equipe e as notas
  calculadas; `RejeitarCandidaturaDialog` e `RetrocederCandidaturaDialog` ganham o aviso
  `AVISO_JUSTIFICATIVA_VISIVEL` ao lado do campo, no momento da escrita.
- **B** — RPC `explicacao_rejeicao_automatica` (migration `20260906000007`) + branch
  automática na página de explicação + o portão do painel consertado.
- **C** — aviso de tempo (`role=status`) enquanto gera + cooldown de **60 s** após erro.

**Três correções de fato que a implementação produziu, e que os registros anteriores não
sabiam** (estão em §7.26 do guia, com o raciocínio completo):

1. **O aviso do A não cabia na tela de decisão final.** §7.22 e a versão anterior deste
   arquivo diziam «a tela de decisão diz ao recrutador…». Mas o campo que o candidato baixa é
   `candidaturas.etapa_justificativa`, e **`registrar_decisao` não escreve nele** — grava em
   `decisao_final`, cuja justificativa a cópia exclui (o próprio §7.22 mediu isso). Pôr o
   aviso ali seria a tela afirmando uma exposição inexistente, o erro simétrico ao que ele
   conserta. Há teste guardando **os dois sentidos**.
2. **O B precisou de uma RPC** — ver a família (d) de §2.
3. **O portão do painel passava por fora**, e o comentário ao lado dizia o contrário: ele já
   falava em «knockout/rejected path» sobre uma linha que **excluía** o knockout.

### 3.2 ✅ E10 — fechado (§7.28)

Respondido pela tela como **RH3** sobre uma decisão de **RH2**, veredito `mantida`. O guard do
decisor já estava provado no servidor (403 / 42501, §7.21); o caminho feliz está medido em
§7.28, com a notificação **entregue** e a tela da candidata conferida.

Restam **2 pedidos pendentes** na fila, os dois dados de teste antigos (a fixture `p46+neg-art20`
e o `[TESTE] Dentista — Funil E2E`). Somem no bloco I.

### 3.3 ⏳ Blocos do guia que ainda não rodaram

| Bloco | O que é | Por que não rodou |
|---|---|---|
| **G** | `/admin/retencao` — janelas de retenção, `deployed_at` dos prompts | É seu (mexe em política de dados) |
| **H** | O *flip* da purga de `dry_run` para `live` | Checkpoint de operador — **irreversível** |
| **I** | Limpeza final | Depende de tudo acima |

### 3.4 ⏳ Limpeza antes de divulgar as vagas (bloco I)

- **15 candidatos fictícios** com e-mail `@invalido.local` (os 6 da comparação + fixtures da
  Phase 46 + 2 anonimizados). Precisam sair antes de qualquer divulgação.
- **3 contas de teste** (`+claude1/2/3`) e os usuários **RH2** e **RH3**.
- A vaga `[TESTE E2E] Social Media` (inativa) e as demais `[TESTE]`.
- O snapshot de viés com período `p45-pos-execucao` (rótulo de fase, não um mês).
- ~~`.planning/WINDOWS.md`~~ — **I2 feito em 2026-09-06** (§7.29): 43 janelas triadas, 33 `fixed`,
  7 `waived`, **3 abertas** — as três precisam rodar smoke contra PROD e são checkpoint seu
  (#4 `p43_previa_smoke`, #38 e #42 `p46_purga_smoke`). Nenhuma fechou sem razão escrita.

### 3.5 ℹ Duas observações abertas, nenhuma bloqueante

**O `anon` pode executar a RPC nova — e isso é o padrão deste projeto.** O `REVOKE ALL FROM
PUBLIC` da migration rodou, mas o projeto tem `ALTER DEFAULT PRIVILEGES` concedendo EXECUTE em
funções ao `anon`, então ela nasce com esse grant. **Não há vazamento:** sem sessão,
`auth.uid()` é NULL e a função devolve `false` sempre. Medido, para comparar:

| Função | `anon` executa? |
|---|---|
| `stamp_explicacao_acessada` · `solicitar_revisao_decisao` · `registrar_decisao` | sim |
| `explicacao_rejeicao_automatica` (a nova) | sim |
| `cancelar_pedido_exclusao` · `responder_revisao_decisao` (as mais novas) | **não** |

Ou seja: a nova segue a maioria, e existe um precedente mais estrito nas duas últimas.
**Não mexi de propósito** — o CLAUDE.md registra que os grants aqui foram raciocinados caso a
caso («o `GRANT` do CR-02 não deve ser revogado»), e mudar permissão em PROD por conta própria
não cabe. Se quiser alinhar com o padrão novo, é um
`REVOKE EXECUTE ON FUNCTION public.explicacao_rejeicao_automatica(uuid) FROM anon;`.

**O `jwt_secret` do projeto apareceu num log de conversa.** Ao buscar a versão do PostgREST,
o endpoint `GET /v1/projects/{ref}/postgrest` da Management API devolveu a config **inteira**,
`jwt_secret` incluso, e isso ficou no transcript daquela sessão. Não foi usado nem repetido.
Se incomodar, rotacione em Settings → API. E fica o registro: **aquele endpoint devolve o
segredo — não o use para consultar versão.**

---

## 4 · Como retomar na prática

### Contas de teste (senha de todas: `Teste123!`)

| Conta | E-mail | Estado |
|---|---|---|
| RH2 (administrador) | `fernandinho.costa.neto+rh2@gmail.com` | ativo |
| T1 candidata | `+claude1@` | **aprovada**, funil completo |
| T2 candidata | `+claude2@` | knockout; exclusão pedida **e cancelada** |
| T3 candidata | `+claude3@` | rejeitada na decisão final, **revisão pedida**; e knockout na Consultor |

⚠ **Sempre limpe o `localStorage` ao trocar de papel** no mesmo navegador. O conserto
`61f07508` fez o login do RH esperar a identidade certa, mas o caminho limpo continua sendo
entrar sem sessão residual.

### Comandos que só você pode rodar (o classificador me bloqueia)

```bash
node p46apply.cjs migrate supabase/migrations/<arquivo>.sql   # migration + ledger com md5
node efdeploy.cjs <slug>                                      # deploy de Edge Function
node authconfig.cjs                                           # config do Auth (--dry-run, --restore)
```

**Tudo o que precisava de deploy está no ar.** Migrations `20260906000001` a `…0007` aplicadas
com md5 conferido; as 7 EFs de IA na versão com o `ai-client` mais recente.

### ⚠ `npm run db:types` PENDURA — e trunca o arquivo ao falhar

Custou tempo em 2026-09-06 e vai custar de novo se não estiver escrito. **Dois problemas
somados:**

1. O CLI abre um prompt (senha do banco / login) que, sem tty, **nunca aparece** — o processo
   fica vivo e ocioso para sempre.
2. O `>` do script **trunca `database.types.ts` antes** de rodar o comando. A falha deixa o
   arquivo com **zero octeto**. Recuperável: `git checkout -- database.types.ts`.

O que funciona:

```bash
SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w) \
  npx supabase gen types typescript --project-id isljnozzlvckrgjjbjwp < /dev/null \
  > database.types.ts
```

O **`< /dev/null` é a parte load-bearing** — sem ele o prompt ressuscita. E não cole comentário
na mesma linha de um `npm run`: o npm repassa as palavras como argumentos do comando.

⚠ Existe uma segunda via (o endpoint `/v1/projects/{ref}/types/typescript` da Management API),
mas ela **omite o schema `graphql_public`** que o CLI inclui. O gerador canônico do repositório
é o CLI.

### Uma armadilha de PROD que custou tempo

Cliques repetidos em «Gerar guia» com execuções de 2 minutos em voo fizeram **todas as EFs de
IA responderem `Failed to fetch`** — e quase levaram à reversão de um commit correto. O log da
função mostrava que ela **estava completando normalmente**: o que derrubava era o limite de
concorrência, esgotado pelas próprias chamadas. Três minutos parado depois, a mesma chamada
respondeu em 3,6 s. **Antes de reverter, leia o log da função.** *(O conserto `7a245d6a` torna
isso mais difícil de reproduzir, mas o limite continua existindo.)*

---

## 5 · Estado técnico de referência

### Migrations aplicadas (todas com md5 conferido no ledger)

| Versão | O que faz |
|---|---|
| `20260906000001` | fictícios saem de `@exemplo.com` (domínio com MX que recebeu e-mails de teste) |
| `20260906000002` | avaliação da entrevista grava `scores_candidato` |
| `20260906000003` | `interview_guide` 8000 e `transcript_analysis` 6000 tokens |
| `20260906000004` | reagendar avisa a candidata e zera o comparecimento |
| `20260906000005` | revisão da redação grava `scores_candidato` + backfill |
| `20260906000006` | rejeição automática (knockout) avisa por e-mail |
| **`20260906000007`** | **RPC `explicacao_rejeicao_automatica` — o knockout ganha explicação** |

Conferido em PROD após o apply da `…0007`: função presente, retorno `boolean`,
`SECURITY DEFINER`, `STABLE`, e a `version` do ledger nasceu **correta** (não o instante do
apply — ver a via atual no CLAUDE.md).

**Prompts ativos:** `cv_job_match` 4096 · `comparative_ranking` 3000 · `interview_guide` 8000 ·
`transcript_analysis` 6000 · `culture_fit_essay` 2500 · `work_sample_sjt` 3000 ·
`bigfive_devolutiva` 1200. Todos `claude-sonnet-4-6`.

### Portões que passam a vigiar — todos provados por execução

A prova é sempre a mesma: reverte-se o conserto e confere-se que o teste **cai**. Um portão que
você tornou incapaz de falhar é pior que o quebrado.

**Da sessão de validação:**

| Portão | O que vigia |
|---|---|
| `_shared/…/structured-output-compat.test.ts` | todo schema passado ao `callAi` é aceito pelos dois provedores. **Mordeu no primeiro giro** e achou o defeito gêmeo na redação técnica |
| `_shared/…/ai-client-budget.test.ts` | o fallback não pode dobrar o teto de tempo |
| `entrevista/…/agendamentoAtivo.test.ts` | partição total do enum de status |
| `pages/…/DashboardCandidatoPage.encerrada.test.tsx` | candidatura encerrada não promete espera |
| `admin/bias-audit/…/gerarSnapshotPeriodo.test.tsx` | snapshot é do mês corrente |

**Da sessão dos vereditos (7 asserções novas, 3 arquivos):**

| Portão | O que vigia | Sondas |
|---|---|---|
| `entrevista/…/GuiaEntrevistaPanel.test.tsx` | o cooldown pós-erro e o aviso de tempo | 2 |
| `privacidade/__tests__/aviso-justificativa-dois-lados.test.ts` | o **conteúdo** da promessa da cópia, nas duas pontas | 2 |
| `explicacao/…` + `DashboardCandidatoPage.funnel` | a inferência do knockout, o CTA de revisão e o portão do painel | 3 |

⭐ O portão da cópia existe por um motivo específico que vale generalizar: **os testes de
render existentes comparavam a tela com a própria constante**, então passariam com a frase
inteira apagada. Ele assere o **conteúdo** da promessa, que é o que envelhece.

### Outros

**`vite.config.ts`:** a exclusão dos testes Deno era uma lista literal de 25 linhas, crescida em
8 fases; virou um extglob (`supabase/functions/**/!(strict-schema).test.ts`). Cada teste Deno
novo quebrava o `npm run test:run` até alguém lembrar de acrescentar a linha.

---

## 6 · Se eu fosse continuar agora

1. **Rodar G e H** (§0.3) — são seus, e o H é irreversível.
2. **Limpeza do bloco I** (§3.4) e então divulgar as vagas.

O **I2** (triagem das 40 janelas do `WINDOWS.md`) não depende de G/H e pode correr em paralelo
com qualquer um deles.

Nada disso depende de código novo. O que sobra do M8 é operação, decisão e limpeza.
