# Retomar aqui — estado em 2026-08-23, fim da sessão

**Como abrir a próxima conversa:**

> *"Leia `.planning/RETOMAR-AQUI.md` e vamos continuar"*

---

## ⛔ A PRIMEIRA COISA — a IA em PROD ainda analisa candidato sem contexto da vaga

O conserto está **no disco e commitado**; a Edge Function **não foi deployada**. Enquanto não
for, toda análise nova continua rodando com rubrica vazia.

```bash
npx supabase functions deploy analise-candidato-individual \
  --project-ref isljnozzlvckrgjjbjwp --no-verify-jwt
```

⚠ Leva **mais de 7 minutos** e imprime linhas que parecem fatais e não são
(`NotFound: .../profile`, `WARNING: Docker is not running`). Rodar em segundo plano e
conferir o resultado por MCP (`list_edge_functions` — a `version` tem de subir), nunca
esperar no primeiro plano. Detalhe em `CLAUDE.md`.

**Como saber que funcionou** (não basta a `version` subir): rodar uma análise e conferir que
`analise_candidato_vaga` não traz o flag `vaga_sem_rubrica`.

---

## O que está feito e no ar

| | |
|---|---|
| Duas vagas reais publicadas | `consultor-relacionamento-pre-vendas` · `social-media-producao-captacao-conteudo` |
| Seis vagas de teste | arquivadas |
| Contas de RH de teste | desativadas — **você é o único RH ativo** |
| Legibilidade da página da vaga | ✅ no ar, aprovada |
| `TextoRico` (markdown restrito) | ✅ no ar — `###`, `-`, `1.`, `**negrito**`, `*itálico*` |
| Migrations `…0016` e `…0017` | ✅ aplicadas em PROD, md5 conferido |
| Purga | `dry_run`, cron ativo |

## O que está no disco e NÃO no ar

- **O conserto da EF de IA** (acima).
- **`secoes_extras` e `rubrica_ia`**: as colunas existem em PROD e estão **vazias** nas duas
  vagas. Falta renderizar as seções na página e escrever as duas rubricas.

---

## A fila, na ordem combinada

### 1 · Deploy da EF + preencher as rubricas
Depois do deploy, escrever a `rubrica_ia` das duas vagas. É a primeira vez que a IA vai
receber critério deliberado — vale escrever com cuidado e discutir antes.

### 2 · Renderizar `secoes_extras` na página da vaga
Usar o `TextoRico` que já existe. As sete seções dos PDFs que não couberam em campo nenhum
(indicadores, rotina, plano de carreira, remuneração, ferramentas, «o que a vaga NÃO é»,
processo seletivo) migram para lá.

### 3 · O plugin de cadastro de vaga
**Outra conversa, com handoff próprio:** `.planning/HANDOFF-plugin-cadastro-de-vaga.md`.
⚠ Ele manda invocar **`skill-creator`** e **`plugin-builder`**, e rodar **`skill-analyzer`**
depois. Não improvisar.

### 4 · Dados de teste para avaliar as análises de IA
⚠ **Só depois do item 1.** Testar qualidade com a EF quebrada mede o modelo, não o sistema.
Fazer numa **terceira vaga não publicada**, para o funil real nascer limpo — candidato
sintético misturado com real polui métricas, comparativo e o snapshot de viés.

### 5 · A sessão de navegador que só você pode fazer
`.planning/RUNBOOK-GO-LIVE-2026-08-23.md`, Passo 3 — 21 itens numerados.
⚠ **O item mais importante é o 3:** as caixas de autorização do cadastro têm de nascer
**desmarcadas**. Se vierem marcadas, pare — é violação de LGPD e a promessa que a Phase 43
existe para cumprir. E marque a caixa de retenção de currículo, que fecha o item aberto da 43.

---

## Correndo em paralelo, sem depender de nós

- **A noite de 2026-08-24 00:00-03**: o cron de purga dispara pela **primeira vez**. De manhã,
  duas consultas fecham o maior gap da Phase 46 sem trabalho nenhum — estão no Passo 4 do
  runbook. Esperado: `veredito='dry_run'`, `processados=0`, zero destruição.
- **O parecer do Encarregado (DPO)**: único item com latência externa, e agora há gente real
  entrando no sistema. Vale cobrar.

---

## Estado do milestone M8

Fases 42, 43, 44, 46 e 47 estão em `Deferred Verification` no `STATE.md`, cada uma com o
fechador nomeado. A 45 é a única `passed`. O lifecycle (`audit → complete → cleanup`) não roda
enquanto não fecharem.

⚠ **Flip da purga `dry_run → live`: 2026-09-06**, checkpoint do operador, runbook próprio em
`.planning/phases/46-*/46-07-RUNBOOK-FLIP.md`. Precisa de **14 noites de ensaio** e hoje há
**0** — o cron nunca disparou até esta data.

---

## Três lições desta sessão que valem para a próxima

1. **Provar o portão por execução, não por leitura.** O `CHECK` da `…0016` aceitava
   `[{"titulo":"X"}]`. O predicado *parecia* completo; só a execução mostrou que jsonpath lax
   não vê chave ausente. Foi pego 30 segundos depois de aplicar, e uma revisão por leitura
   teria aprovado.
2. **Re-revisar o conserto antes de aplicar.** A cadeia da Phase 46: o primeiro conserto
   introduziu **2 blockers novos**, pegos só pela re-revisão. Duas vezes seguidas nesta base.
3. **Olhar a tela com conteúdo real.** Os dois defeitos de markdown (`**Contam pontos:**` e
   `*(foco atual)*` aparecendo literais) não seriam pegos por teste unitário — um estava em
   campos que esqueci de ligar, o outro era marca que o renderizador não conhecia.
