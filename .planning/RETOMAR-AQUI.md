# Retomar aqui — estado em 2026-09-06, depois da sessão dos vereditos

**Como abrir a próxima conversa:**

> *"Leia `.planning/RETOMAR-AQUI.md` e `.planning/GUIA-VALIDACAO-FINAL.md` §7, e vamos continuar"*

O guia de validação (`GUIA-VALIDACAO-FINAL.md`) é o documento longo: §0–§6 é o plano de teste,
§7.1–§7.26 é o **diário do que foi medido**, com o resultado de cada item e o commit de cada
conserto. Este arquivo aqui é o resumo executivo e a lista do que falta.

---

## Em uma frase

Dois dias de teste manual em produção encontraram **19 defeitos**, todos consertados e no ar;
o funil inteiro do candidato foi percorrido de ponta a ponta com contas reais; **as 3 decisões
foram tomadas e implementadas** (§7.26); o que resta são **1 apply de migration seu**, **1
teste bloqueado** por falta de uma segunda conta de RH, os blocos **G e H** (que são seus), e a
**limpeza** dos dados de teste antes de divulgar as vagas.

---

## 0 · O que fazer primeiro, hoje

✅ **Feito em 2026-09-06:** a migration `20260906000007` está **aplicada** (md5 conferido no
ledger, `version` correta) e os tipos foram regenerados. A RPC
`explicacao_rejeicao_automatica` existe em PROD, `boolean`, `SECURITY DEFINER`, `STABLE`.

**Falta conferir na tela** — é a única verificação pendente da decisão B, e ela precisa dos
seus olhos porque é uma conta de candidato:

1. Entrar como **T2** ou **T3** (as duas levaram knockout na Consultor; senha `Teste123!`).
2. No painel, o cartão **«Entenda a decisão sobre sua candidatura»** deve aparecer no cartão
   da Consultor — ele **nunca apareceu** nesse caso antes de hoje.
3. Abrir a explicação. Ela deve dizer que a candidatura foi encerrada **automaticamente, sem
   avaliação de uma pessoa**, e **não** deve oferecer pedido de revisão — no lugar dele, o
   bloco «Se você quiser falar sobre esta decisão» com o `lgpd@beautysmile.com.br`.
4. Confira também uma rejeição **humana** de triagem, se houver: ela deve continuar **sem**
   página de explicação. É o portão que mais importa — o texto «foi automático» numa decisão
   que uma pessoa escreveu seria pior que a falta de página.

Duas candidaturas de knockout existem em PROD hoje (`0f7b217c…` e `92522073…`), as duas com
`etapa_atual='inscricao'`, `opcao_knockout_id` preenchido e zero linhas em `decisao_final`.

Depois: criar a conta **RH3** (§3.2) e o E10 fecha o bloco E inteiro.

### ⚠ `npm run db:types` PENDURA neste ambiente — e trunca o arquivo ao falhar

O CLI abre um prompt (senha do banco / login) que, sem tty, nunca aparece: o processo fica
vivo e ocioso para sempre. E o `>` do script **trunca `database.types.ts` antes** de rodar o
comando, então a falha deixa o arquivo com **zero octeto** (recuperável com
`git checkout -- database.types.ts`). O que funciona:

```bash
SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -a supabase -w) \
  npx supabase gen types typescript --project-id isljnozzlvckrgjjbjwp < /dev/null \
  > database.types.ts
```

O `< /dev/null` é a parte que resolve — sem ele o prompt ressuscita.

---

## 1 · O que está funcionando, medido e não lido

Percorri o funil completo com três contas de teste (`+claude1`, `+claude2`, `+claude3` no seu
Gmail), conferindo **cada resultado no banco e cada e-mail na caixa de entrada real** — nunca
apenas na tela.

| Bloco | Estado |
|---|---|
| Inscrição, triagem com IA, SJT, redação cultural | ✅ §7.8–7.11 |
| Agendamento, convite com `.ics`, reagendamento com aviso | ✅ §7.12, §7.17 |
| Guia de entrevista, análise de transcrição | ✅ §7.14, §7.25 |
| Decisão final com os 3 pesos, e-mail de aprovação | ✅ §7.20 |
| Knockout com e-mail, explicação e revisão do Art. 20 | ✅ §7.18, §7.21, §7.24 |
| Cópia de dados, exclusão com arrependimento | ✅ §7.22, §7.23 |
| Auditoria de viés, fila de pedidos de dados | ✅ §7.17, §7.24 |

**Suítes:** `deno test` 484/484 · `vitest` **1980/1980** (200 arquivos) · `tsc` 90 erros
(baseline congelada 96 — não subiu).

**47 commits na sessão de validação**, do `a7fc5973` ao `ecaa98e7`; mais **3** na sessão dos
vereditos, até `12ec4e42`.

---

## 2 · Os defeitos que valem lembrar (o padrão importa mais que a lista)

Três famílias explicam quase tudo o que foi encontrado. Elas vão se repetir.

**a) O score que ninguém escrevia.** Dos três pesos da decisão final, **dois nunca chegavam ao
consolidador**: a redação e a entrevista gravavam só nas suas tabelas próprias, e o consolidador
lê `scores_candidato`. Toda vaga calculava o agregado sobre um terço do que deveria — sem erro,
sem alarme. Achei porque varri os **três** pesos em vez de só o que falhou. Migrations
`…0002` (entrevista) e `…0005` (redação, com backfill). §7.16, §7.20.

**b) O cache que servia a resposta errada.** A chave de idempotência não cobria o input, depois
não cobria o schema. Consequência medida: clicar «Gerar guia» devolvia, em menos de um segundo e
sem chamada nova, a saída de 40 minutos antes — e, no vizinho, uma transcrição **nova** teria
recebido a análise da **anterior**, com as citações de outra conversa. Só ficou observável
quando o replay passou a funcionar: **consertar o cache ligou o defeito**. `a01321a8`, `7bc7ef2b`.

**c) A lista literal que envelhece.** O filtro `.eq('status','agendada')` — meu próprio conserto
da manhã — quebrou no primeiro reagendamento da tarde, com a mesma mensagem do defeito que
resolvia. O gate de auditoria de viés pedia o período do snapshot exibido. O login do RH esperava
«existe papel» em vez de «existe papel deste usuário». `6f26a25c`, `05530472`, `61f07508`.

> **Lição da sessão, e vale escrever:** quase todo defeito de hoje era **silencioso**. Nenhum
> derrubava a tela; todos entregavam um resultado plausível. O que os revelou foi sempre
> comparar a tela com o banco, e nunca aceitar «a tela mostrou» como prova.

---

## 3 · O que falta — em ordem de importância

### 3.1 ✅ As três decisões — tomadas e implementadas (§7.26)

| | Veredito | Commit | Estado |
|---|---|---|---|
| **A** · a cópia entrega o que o recrutador escreve (§7.22) | manter a allowlist, **avisar os dois lados** | `5123ef04` | ✅ no código |
| **B** · explicação e revisão no knockout (§7.18) | **explicação sim, revisão não** (caminho 2) | `12ec4e42` | ✅ aplicada em PROD · ⏳ falta conferir na tela (§0) |
| **C** · a geração do guia leva 60–130 s (§7.25) | **travar o botão e mostrar o tempo** | `7a245d6a` | ✅ no código |

**Duas coisas que a implementação descobriu, e que o registro anterior não sabia:**

**O aviso do A não podia ir para a tela de decisão final.** Este arquivo dizia «a tela de
decisão diz ao recrutador…». Mas o campo que o candidato baixa é
`candidaturas.etapa_justificativa`, e `registrar_decisao` **não escreve nele** — grava em
`decisao_final`, cuja justificativa a cópia exclui (o §7.22 mediu isso). O aviso foi para a
**rejeição na triagem** e o **retrocesso de etapa**, que são as telas que escrevem o campo
exposto. Há teste guardando os dois sentidos.

**O B precisou de uma RPC, pela lição da sessão outra vez.** Do lado do cliente, a rejeição
**humana** da triagem e o knockout **automático** são a mesma linha (as duas com
`status='rejeitado'`, as duas sem `decisao_final`, e a allowlist do candidato exclui
`motivo_rejeicao` de propósito). Inferir knockout da ausência de decisão teria dado a uma
rejeição **escrita por uma pessoa** o texto da automática — plausível, silencioso e errado
sobre o fato mais importante daquela página. E o cartão do painel **passava por fora do
portão** desde sempre: ele exigia a etapa, e o knockout preserva `inscricao` por desenho.

### 3.2 ⏳ E10 — bloqueado por uma conta

Falta responder a um pedido de revisão **como outra pessoa** — quem decidiu está corretamente
barrado (provado no servidor: HTTP 403 com a mensagem do guard, §7.21). Precisa de uma segunda
conta de RH. Preenchi o formulário em `/rh/configuracoes` → «Novo usuário» (RH3 Revisor,
`fernandinho.costa.neto+rh3@gmail.com`, papel **Administrador**), mas **criar contas é bloqueado
no meu ambiente** — some dos meus comandos, não é erro do sistema. Crie você e me avise, ou
decida pular.

Há **3 pedidos de revisão pendentes** na fila hoje (2 são dados de teste antigos, 1 é a T3).

### 3.3 ⏳ Blocos do guia que ainda não rodaram

| Bloco | O que é | Por que não rodou |
|---|---|---|
| **G** | `/admin/retencao` — janelas de retenção, `deployed_at` dos prompts | É seu (mexe em política de dados) |
| **H** | O *flip* da purga de `dry_run` para `live` | Checkpoint de operador — irreversível |
| **I** | Limpeza final | Depende de tudo acima |

### 3.4 ⏳ Limpeza antes de divulgar as vagas (bloco I)

- **15 candidatos fictícios** com e-mail `@invalido.local` (os 6 da comparação + fixtures da
  Phase 46 + 2 anonimizados). Precisam sair antes de qualquer divulgação.
- **3 contas de teste minhas** (`+claude1/2/3`) e o usuário **RH2**.
- A vaga `[TESTE E2E] Social Media` (inativa) e as demais `[TESTE]`.
- O snapshot de viés com período `p45-pos-execucao` (rótulo de fase, não um mês).
- `.planning/WINDOWS.md` — triagem pendente desde antes desta sessão.

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
node p46apply.cjs migrate supabase/migrations/<arquivo>.sql   # aplica migration + ledger com md5
node efdeploy.cjs <slug>                                      # deploy de Edge Function
node authconfig.cjs                                           # config do Auth (tem --dry-run e --restore)
```

**Tudo o que precisava de deploy já está no ar.** Migrations `20260906000001` a `…0006`
aplicadas com md5 conferido; as 7 EFs de IA na versão com o `ai-client` mais recente.

### Uma armadilha que me custou tempo, para você não repetir

Cliquei várias vezes em «Gerar guia» enquanto execuções de 2 minutos estavam em voo. Resultado:
**todas as EFs de IA passaram a responder `Failed to fetch`** e eu quase reverti um commit
correto. Fui ao log da função e vi que ela **estava completando normalmente** — o que derrubava
era o limite de concorrência, esgotado pelas minhas próprias chamadas. Três minutos parado
depois, a mesma chamada respondeu em 3,6 s. **Antes de reverter, leia o log da função.**

---

## 5 · Estado técnico de referência

**Migrations aplicadas nesta sessão** (todas com md5 conferido no ledger):

| Versão | O que faz |
|---|---|
| `20260906000001` | fictícios saem de `@exemplo.com` (domínio com MX que recebeu e-mails de teste) |
| `20260906000002` | avaliação da entrevista grava `scores_candidato` |
| `20260906000003` | `interview_guide` 8000 e `transcript_analysis` 6000 tokens |
| `20260906000004` | reagendar avisa a candidata e zera o comparecimento |
| `20260906000005` | revisão da redação grava `scores_candidato` + backfill |
| `20260906000006` | rejeição automática (knockout) avisa por e-mail |

**Prompts ativos:** `cv_job_match` 4096 · `comparative_ranking` 3000 · `interview_guide` 8000 ·
`transcript_analysis` 6000 · `culture_fit_essay` 2500 · `work_sample_sjt` 3000 ·
`bigfive_devolutiva` 1200. Todos `claude-sonnet-4-6`.

**Portões novos que passam a vigiar** (todos provados por execução — reverti o conserto e vi
falhar):
- `_shared/__tests__/structured-output-compat.test.ts` — todo schema passado ao `callAi` tem de
  ser aceito pelos dois provedores. **Mordeu no primeiro giro** e achou o defeito gêmeo na
  redação técnica.
- `_shared/__tests__/ai-client-budget.test.ts` — o fallback não pode dobrar o teto de tempo.
- `entrevista/services/__tests__/agendamentoAtivo.test.ts` — partição total do enum de status.
- `components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx` — candidatura encerrada
  não promete espera.
- `admin/bias-audit/__tests__/gerarSnapshotPeriodo.test.tsx` — snapshot é do mês corrente.

**`vite.config.ts`:** a exclusão dos testes Deno era uma lista literal de 25 linhas, crescida em
8 fases; virou um extglob (`supabase/functions/**/!(strict-schema).test.ts`). Cada teste Deno
novo quebrava o `npm run test:run` até alguém lembrar de acrescentar a linha.

---

## 6 · O que eu faria primeiro, se fosse continuar agora

1. **Aplicar a `20260906000007`** e rodar `npm run db:types` — sem isso a decisão B está no
   repositório e não em produção (§0).
2. **Criar a conta de RH3** e fechar o E10 — 10 minutos, e fecha o bloco E inteiro.
3. **Rodar G e H** (retenção e o flip da purga) — são seus, e o H é irreversível.
4. **Limpeza do bloco I** e então divulgar as vagas.

Depois de aplicar a migration, vale **conferir o B na tela**: entrar como a T3 (que levou
knockout na Consultor), ver o cartão «Entenda a decisão» aparecer no painel — ele nunca
apareceu nesse caso — e abrir a explicação, que deve dizer que foi automático e **não** oferecer
pedido de revisão.

O M8 é o último milestone planejado. Fechando esses quatro itens, o projeto está fechado como
está escopado hoje.
