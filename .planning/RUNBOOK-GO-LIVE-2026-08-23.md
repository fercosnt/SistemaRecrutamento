# Runbook — abrir o sistema para candidatos reais

**Escrito em:** 2026-08-23, depois de uma passada pelo site real (`rh.beautysmile.com.br`)
**Para:** Fernando, executar quando puder
**Objetivo:** sair do estado atual (catálogo público inteiro de teste) para duas vagas reais
recebendo inscrições, com o fluxo do candidato provado por uma pessoa antes de valer para todas.

---

## ⛔ Leia isto primeiro

**O site está no ar e público agora, anunciando 6 vagas — e as seis são de teste.**

Quem abrir `https://rh.beautysmile.com.br/vagas` neste momento vê:

| Vaga visível hoje | |
|---|---|
| `[TESTE] Dentista — Funil E2E` | ⛔ |
| `[TESTE] Analista de Marketing Digital` | ⛔ |
| `[TESTE] Coordenador de Recursos Humanos` | ⛔ |
| `[TESTE] Auxiliar de Saúde Bucal (ASB)` | ⛔ |
| `Dev Backend` | ⛔ |
| `fixture-p46 vaga ativa (sintetica)` | ⛔⛔ |

Isso não é pendência de compliance nem gap de milestone. É a cara pública da clínica, e é o
único item deste runbook que já está causando dano enquanto você lê. **O Passo 2 resolve.**

---

## O que já foi feito (não precisa refazer)

- ✅ **As duas vagas reais existem no banco**, em `rascunho`, com `created_by` apontando para
  você (`4fceff36-8c42-40a5-ad11-48bf0fc6cc81`). Transcritas dos PDFs, sem resumir.
- ✅ **As contas de RH de teste foram desativadas** — você rodou o SQL. Hoje **você é o único
  usuário de RH ativo**. `E2E Admin (teste)`, `Recrutador Teste`, `Recruiter` e `Admin RH` estão
  todos `ativo = false`.
- ✅ **96 commits enviados ao GitHub** (`HEAD == origin/main`).
- ✅ Migrations `20260823000014` e `…0015` aplicadas em PROD, com md5 conferido no ledger.

⚠ **Consequência de ter desativado o recrutador:** só administradores operam o sistema agora.
Quando contratar, crie o usuário de RH real antes de repassar o trabalho.

---

## PASSO 1 · Aprovar o texto das duas vagas

Antes de publicar, leia. Entre em `https://rh.beautysmile.com.br` com sua conta
(`fernando@beautysmile.com.br`) e vá em **`/rh/vagas`**. As duas aparecem como `rascunho`.

| Vaga | Slug | Depto | Faixa gravada |
|---|---|---|---|
| Consultor(a) de Relacionamento e Pré-vendas | `consultor-relacionamento-pre-vendas` | Comercial | 3.000 – 5.200 |
| Social Media — Produção e Captação de Conteúdo | `social-media-producao-captacao-conteudo` | Marketing | 3.500 – 4.500 |

**Três decisões que eu tomei por você e que talvez queira mudar:**

1. **`exibir_salario = false` nas duas.** A faixa está gravada mas **não aparece** na página
   pública. Se quiser exibir, o cuidado é com a de SDR: o fixo é R$ 3.000 e a faixa realista é
   R$ 4.000–5.200. Gravei `min 3000 / max 5200`, que é honesto, mas na tela pode ler como
   "a partir de 3 mil" e afastar candidato bom. Se for exibir, considere `min 4000`.
2. **`total_vagas = 1`** em cada.
3. **Título do SDR:** usei *"Consultor(a) de Relacionamento e Pré-vendas"*, que é como o PDF
   nomeia. O subtítulo carrega o *"também divulgada como Analista de Relacionamento Comercial"*.

**O que conferir na leitura:** se algum trecho do PDF ficou fora, se a remuneração está do jeito
que você quer que um estranho leia, e se o "sobre a empresa" está atualizado.

---

## PASSO 2 · A troca — arquivar as 6 de teste e publicar as 2 reais

**Faça isto só depois do Passo 1.** É um comando só, no SQL Editor do Supabase, e resolve o
problema público inteiro.

```sql
BEGIN;

-- (a) tira as 6 de teste do ar. `arquivada` some da listagem pública e NÃO apaga nada —
--     as candidaturas de teste continuam lá, e dá para reverter trocando para 'ativa'.
UPDATE public.vagas
   SET status = 'arquivada', updated_at = now(),
       updated_by = '4fceff36-8c42-40a5-ad11-48bf0fc6cc81'
 WHERE status = 'ativa'
   AND slug NOT IN ('consultor-relacionamento-pre-vendas',
                    'social-media-producao-captacao-conteudo');

-- (b) publica as duas reais.
UPDATE public.vagas
   SET status = 'ativa', data_abertura = CURRENT_DATE, updated_at = now(),
       updated_by = '4fceff36-8c42-40a5-ad11-48bf0fc6cc81'
 WHERE slug IN ('consultor-relacionamento-pre-vendas',
                'social-media-producao-captacao-conteudo');

-- (c) confira ANTES de confirmar. Tem de voltar EXATAMENTE 2 linhas, as suas.
SELECT titulo, slug, status, created_by IS NOT NULL AS tem_dono
  FROM public.vagas WHERE status = 'ativa' ORDER BY titulo;

COMMIT;
```

⚠ **Leia o resultado do (c) antes de dar `COMMIT`.** Se vierem 3 linhas ou uma vaga com
`tem_dono = false`, dê `ROLLBACK` e me chame.

**Depois:** abra `https://rh.beautysmile.com.br/vagas` numa aba anônima. Tem de mostrar
**"2 vagas disponíveis"**, as suas.

**Os links para divulgar** (use o slug, não o UUID que aparece ao clicar):

```
https://rh.beautysmile.com.br/vagas/consultor-relacionamento-pre-vendas
https://rh.beautysmile.com.br/vagas/social-media-producao-captacao-conteudo
```

---

## PASSO 3 · A sessão de navegador — provar o fluxo antes de gente real

**Por que isto importa:** ninguém nunca passou pelo cadastro e pela inscrição neste sistema. Se
você não fizer, seus primeiros testadores serão candidatos de verdade.

### ⚠ Três ordens obrigatórias — furar invalida trabalho já feito

1. **O cadastro tem de ser NOVO, com a caixa de retenção de currículo MARCADA.** É a única forma
   de ver o bloco de guarda do currículo, que é o item aberto da Phase 43. A conta que já foi
   testada deixou essa caixa desmarcada — por isso o item nunca fechou.
2. **O primeiro clique no pedido de cópia queima o cooldown de 24 h.** Só clique quando estiver
   pronto para observar as duas telas (o download e depois o botão desabilitado com o motivo).
3. **O pedido de exclusão encerra as candidaturas.** É o último passo de tudo, e numa conta que
   você não vá precisar depois.

O roteiro completo dos 14 itens de navegador está em `.planning/UAT-SESSAO-CONSOLIDADA.md` —
inclusive um aviso de 2026-08-22 sobre **não fazer o §D na conta A**. Abra esse arquivo junto.

### 3.1 · Cadastro (o que mais importa)

Abra `https://rh.beautysmile.com.br/cadastro` — **numa janela anônima**, para não misturar com
a sua sessão de administrador. É um wizard de 4 etapas:

**Dados Pessoais → Endereço → Disponibilidade → Autorizações**

Use um e-mail que você controle e consiga abrir (ex.: `seunome+teste1@gmail.com`).

⚠ **`NOTIFICACOES_MODO` está em `producao`: todo evento manda e-mail DE VERDADE.** Isso é o
correto para valer, mas significa que este teste vai encher sua caixa. Use um endereço com `+`
para filtrar depois.

**O que observar, em ordem:**

| # | Onde | O que tem de acontecer | Se falhar |
|---|---|---|---|
| 1 | Etapa 1 | Validação de idade mínima (16 anos) dispara com data recente | anote a mensagem exata |
| 2 | Etapa 2 | O CEP preenche cidade/estado sozinho | é chamada a serviço externo — se travar, anote |
| 3 | **Etapa 4 — Autorizações** | **TODAS as caixas nascem DESMARCADAS** | ⛔ **é violação de LGPD, me chame antes de seguir** |
| 4 | Etapa 4 | **MARQUE** a de retenção de currículo | sem isso o item da Phase 43 não fecha |
| 5 | Etapa 4 | O texto de cada autorização é legível e diz o que faz | anote o que estiver obscuro |
| 6 | Após enviar | Chega e-mail de confirmação | se não chegar, anote quanto tempo esperou |

O item **3** é o mais importante da sessão inteira. Consentimento pré-marcado não é
consentimento — e essa é justamente a promessa que a Phase 43 existe para cumprir.

### 3.2 · Inscrição numa vaga

Com a conta criada, vá numa das duas vagas reais e clique **Candidatar-se a esta vaga**.

| # | O que observar |
|---|---|
| 7 | O login preserva o destino: depois de entrar você cai no formulário da vaga certa, não na home |
| 8 | Upload de currículo funciona (PDF) — anote o tamanho máximo aceito |
| 9 | O formulário salva progresso se você sair e voltar |
| 10 | Ao enviar, chega e-mail e a candidatura aparece em `/candidato/dashboard` |

### 3.3 · Os direitos do titular (fecha itens da Phase 44)

Ainda logado como o candidato, vá em **`/candidato/privacidade`**.

| # | O que observar |
|---|---|
| 11 | **Bloco de guarda do currículo** — a linha «Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.» ⚠ só aparece se você marcou a caixa no item 4 |
| 12 | **Pedido de cópia dos dados** → baixa **DOIS** arquivos, e o `.json` chega primeiro |
| 13 | O `.html` abre legível, com carimbo no topo e versão da allowlist no rodapé |
| 14 | **2º clique dentro de 24 h** → botão desabilitado **com o motivo e a hora de liberação ao lado** |
| 15 | **Seu currículo** → «Abrir meu currículo» abre em aba nova |
| 16 | Copie a URL do currículo, espere ~90 s, recarregue → tem de **expirar** |
| 17 | Com DevTools aberto: a URL assinada **não** aparece no console nem em atributo do documento |

⚠ **Se o item 15 der 403 ou 400: PARE e anote o caminho medido.** É uma hipótese conhecida
(currículo salvo noutra convenção de pasta). O conserto é da policy ou do upload, **nunca** do
componente.

### 3.4 · O lado do RH

Saia da janela anônima e volte à sua sessão de administrador.

| # | Onde | O que observar |
|---|---|---|
| 18 | `/rh/candidatos` | O candidato que você criou aparece |
| 19 | `/rh/candidato/:id` | O **Histórico** renderiza rótulos de texto, nunca um UUID e nunca erro de banco. ⚠ Hoje as 13 linhas vivas têm `ator` nulo, então espere **"Sistema"** em todas — isso é correto, não é bug |
| 20 | `/rh/pedidos-dados` | O pedido de cópia do item 12 aparece na fila |
| 21 | `/rh/vagas` | As duas vagas reais, e as 6 de teste como `arquivada` |

---

## PASSO 4 · Amanhã de manhã — de graça

O cron de purga dispara pela **primeira vez na história** hoje à meia-noite
(**2026-08-24 00:00-03**). Ele está em `dry_run`: a primeira coisa que faz é **não apagar nada**.

Amanhã, rode:

```sql
SELECT jobid, status, return_message, start_time, end_time
  FROM cron.job_run_details WHERE jobid = 6 ORDER BY start_time DESC;

SELECT iniciada_em, veredito, elegiveis, processados, notificacoes_expurgadas
  FROM public.purga_execucoes ORDER BY iniciada_em DESC LIMIT 3;
```

**Esperado:** uma linha nova, `veredito = 'dry_run'`, `processados = 0`, zero destruição.
Isso fecha sozinho o maior gap da Phase 46 (`PURGA-01`/`PURGA-03`), sem nenhum trabalho.

⚠ **Se `processados` vier diferente de 0, me chame imediatamente.**

⚠ **Detalhe de calendário que estava errado no registro do projeto:** `cron.timezone = GMT`,
então o agendamento `0 3 * * *` é **00:00 de Brasília**, não 03:00.

---

## O que NÃO bloqueia abrir as vagas

Nada disto impede candidato de se inscrever. Fica registrado para não virar surpresa.

| Item | Situação | Quando resolver |
|---|---|---|
| **Parecer do Encarregado (DPO)** sobre as páginas públicas | ⏸ aberto — a publicação atual foi liberada só por você em 11/08 | ⚠ **ganha urgência** a partir do momento em que houver dado de gente real. Comece a pedir agora, é o único item com latência externa |
| **Não existe tela de criar vaga** | `/rh/vagas/nova` existe mas não cria — não há mutation de criação no código. Vaga se cria por `INSERT` direto, e é por isso que 9 de 12 estavam órfãs | quando quiser autonomia para abrir vaga sem mim |
| Phase 46 · critério 2 do portão destrutivo | aceito por override datado (2026-08-23) | fechado |
| Phase 46 · `HI-01`/`HI-02` | consertados hoje, **no disco** — não aplicados | o `…0014`/`…0015` já foram; estes são smoke + runbook, sem apply |
| Phases 42/43/44 | verificação diferida | os itens de navegador do Passo 3 fecham boa parte |
| 8 linhas sintéticas em `candidatos` | residentes em PROD, de fixture | ⚠ decidir o destino **antes de 2026-09-06** (o flip da purga) |
| Flip da purga `dry_run → live` | **2026-09-06**, checkpoint seu | runbook próprio: `.planning/phases/46-*/46-07-RUNBOOK-FLIP.md` |

---

## Se algo der errado

**Tirar as vagas do ar rápido:**

```sql
UPDATE public.vagas SET status = 'inativa', updated_at = now()
 WHERE slug IN ('consultor-relacionamento-pre-vendas',
                'social-media-producao-captacao-conteudo');
```

**Desligar a purga** (não precisa hoje — ela está em `dry_run` e não destrói nada):

```sql
SELECT cron.alter_job(job_id := 6, active := false);
```

⚠ **Não use `UPDATE cron.job SET active = false`** — levanta `42501`. Foi um defeito que este
runbook trazia e que consertamos hoje. Segunda opção, se `alter_job` não responder:
`SELECT cron.unschedule('purga-retencao-sweep');`

**Anote tudo que estranhar**, mesmo o que parecer bobagem. A frase que vale para este projeto
inteiro: um diagnóstico plausível que ninguém mediu vira fato por sobrevivência.
