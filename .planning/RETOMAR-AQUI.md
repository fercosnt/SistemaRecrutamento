# Retomar aqui — estado em 2026-09-06, fim da sessão de validação final

**Como abrir a próxima conversa:**

> *"Leia `.planning/RETOMAR-AQUI.md` e `.planning/GUIA-VALIDACAO-FINAL.md` §7, e vamos continuar"*

O guia de validação (`GUIA-VALIDACAO-FINAL.md`) é o documento longo: §0–§6 é o plano de teste,
§7.1–§7.25 é o **diário do que foi medido**, com o resultado de cada item e o commit de cada
conserto. Este arquivo aqui é o resumo executivo e a lista do que falta.

---

## Em uma frase

Dois dias de teste manual em produção encontraram **19 defeitos**, todos consertados e no ar;
o funil inteiro do candidato foi percorrido de ponta a ponta com contas reais; o que resta são
**3 decisões suas**, **1 teste bloqueado** por falta de uma segunda conta de RH, e a **limpeza**
dos dados de teste antes de divulgar as vagas.

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

**Suítes:** `deno test` 484/484 · `vitest` 1956/1956 (199 arquivos) · `tsc` 90 erros (baseline
congelada 96 — não subiu).

**47 commits hoje**, do `a7fc5973` ao `ecaa98e7`.

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

### 3.1 ⏳ Três decisões suas (nada bloqueia o sistema; todas mudam produto ou postura)

**A · A cópia de dados entrega o que o recrutador escreve.** *(§7.22)*
O arquivo que o candidato baixa inclui `candidaturas.etapa_justificativa` — o texto integral da
justificativa — e o `score_match`. É **deliberado** (a allowlist marca `preservar_com_ressalva`,
e acesso pelo Art. 18 é mais amplo que explicação pelo Art. 20). O problema é que **ninguém avisa
os dois lados**: a tela de privacidade descreve a cópia como «o resultado e a explicação das
avaliações», e a tela de decisão diz ao recrutador que aquilo vai «para a trilha de auditoria»,
o que soa interno. Ele pode escrever com franqueza sem saber que o candidato baixa aquilo.
**Recomendo:** ajustar a copy nas duas pontas e manter a regra. Tirar da cópia é uma linha na
allowlist, se preferir o contrário.

**B · Explicação e revisão para quem cai no knockout.** *(§7.18)*
Você já decidiu o e-mail, e ele está no ar. Falta decidir se quem é eliminado por resposta
eliminatória também tem direito à página de explicação e ao pedido de revisão — hoje só quem é
rejeitado na decisão final tem. É a decisão em que **nenhum humano olhou**, o que inverte o que
o Art. 20 protege. Os quatro caminhos estão escritos em §7.18; o (3), abrir revisão para o
knockout, é o que mais muda o volume de trabalho do RH.

**C · A geração do guia leva de 60 a 130 segundos e a tela não avisa.** *(§7.25)*
Quem usa tende a clicar de novo, e aí duas execuções correm juntas e **a última a terminar grava
por cima** — pode ser a pior das duas. Foi o que aconteceu comigo: o guia salvo acabou sendo o do
fallback com 5 perguntas, não o do Sonnet com 7. **Recomendo:** tornar a geração assíncrona
(dispara, avisa «estamos gerando», a tela atualiza sozinha) ou, no mínimo, travar o botão e
mostrar o tempo esperado.

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

1. **Decidir A e C** (§3.1) — são as duas que afetam alguém de fora: um candidato lendo o que o
   recrutador escreveu, e um recrutador esperando 2 minutos sem saber disso.
2. **Criar a conta de RH3** e fechar o E10 — 10 minutos, e fecha o bloco E inteiro.
3. **Rodar G e H** (retenção e o flip da purga) — são seus, e o H é irreversível.
4. **Limpeza do bloco I** e então divulgar as vagas.

O M8 é o último milestone planejado. Fechando esses quatro itens, o projeto está fechado como
está escopado hoje.
