# Retomar aqui — estado em 2026-08-23, segunda sessão

**Como abrir a próxima conversa:**

> *"Leia `.planning/RETOMAR-AQUI.md` e vamos continuar"*

---

## ✅ A IA voltou a avaliar com contexto E com critério — os dois consertos estão no ar

A sessão de 2026-08-23 (noite) fechou o item que abria este arquivo, e encontrou **o gêmeo dele**.

**1 · EF `analise-candidato-individual` deployada.** `version` 16 → 17. O deploy levou ~40s,
não os 7 minutos previstos. Provado por execução, não por leitura: reprocessei uma candidatura
e o flag saiu de `[]` para `vaga_sem_rubrica_deliberada`. Os dois flags são mutuamente
exclusivos no código — `vaga_sem_rubrica` só aparece se a consulta FALHA, e
`vaga_sem_rubrica_deliberada` só aparece se a vaga CARREGOU. O primeiro sumiu.

**2 · ⛔ O gêmeo: os prompts ativos eram `[SEED PLACEHOLDER]`.** O seed da Phase 9 escreveu 8
linhas com corpo placeholder; 4 foram hidratadas depois **por SQL ad-hoc, sem migration e sem
entrada no ledger** (não há artefato). Três nunca foram, e estavam `is_active=true`:
`cv_job_match`, `comparative_ranking`, `work_sample_sjt`.

Como o `ai-client` manda `system_template` DIRETO como system prompt, a IA avaliava candidato
com a instrução literal `"[SEED PLACEHOLDER] system_template — hydrated from…"` (124 caracteres).
Saída válida porque o schema Zod é enforced; critério nenhum porque o prompt estava vazio.
As sete análises cegas eram **duplamente** cegas: sem vaga *e* sem instrução.

Consertado pela migration `…0018`, aplicada via `p46apply.cjs` (md5 do ledger conferido). Hoje:
**zero placeholders ativos**.

**O antes/depois, na mesma candidatura de teste** — estudante de Publicidade avaliada para
Auxiliar de Saúde Bucal:

| | prompt placeholder | prompt real |
|---|---|---|
| score | **75** | **2** |
| gaps | `[]` | 5 requisitos concretos (CRO, instrumentação, biossegurança…) |
| reasoning | ausente | CoT estruturado, cruzando os `requisitos_*` da vaga |

O 75 era ficção. O reasoning citando os requisitos da vaga é a prova cruzada de que **os dois**
consertos estão no ar ao mesmo tempo.

### Resíduos conhecidos (nenhum bloqueia o funil)

- `cv_summary` continua placeholder — `is_active=false`, sem EF consumidora. Deliberado.
- **`culture_fit_essay` não pôde ter o `content_hash` corrigido**: tem `deployed_at`
  preenchido e o trigger `prevent_published_prompt_edit` torna o conteúdo imutável POR DESIGN.
  Corrigir exige versão nova, não `UPDATE`. Não contornei o guard.
- **`scripts/sync-prompts.ts` é código morto** e nunca rodou com sucesso: (a) 5 linhas ainda
  têm o `content_hash` sentinela, então o guard RF-PL-11 lança para sempre; (b) o
  `buildUpsertRow` escreve `fallback_model_id`, **coluna que não existe** na tabela → 400.
  O cabeçalho do script (linhas 15-20) e o guard (260-270) se contradizem.
- As 3 linhas hidratadas ficaram com `deployed_at` NULL de propósito — travá-las no mesmo
  movimento tiraria a chance de corrigir um erro descoberto minutos depois. **Decisão pendente:**
  carimbar `deployed_at` para o guard de imutabilidade passar a valer.

⚠ **A migration `…0018` está no disco e NÃO commitada** — `git status` vai mostrá-la.

---

## O que está feito e no ar

| | |
|---|---|
| Duas vagas reais publicadas | `consultor-relacionamento-pre-vendas` · `social-media-producao-captacao-conteudo` |
| Seis vagas de teste | arquivadas |
| Contas de RH de teste | desativadas — **você é o único RH ativo** |
| Legibilidade da página da vaga | ✅ no ar, aprovada |
| `TextoRico` (markdown restrito) | ✅ no ar — `###`, `-`, `1.`, `**negrito**`, `*itálico*` |
| Migrations `…0016`, `…0017` e `…0018` | ✅ aplicadas em PROD, md5 conferido |
| EF `analise-candidato-individual` | ✅ v17 no ar — enxerga a vaga |
| Prompts ativos de IA | ✅ reais — zero placeholders ativos |
| Purga | `dry_run`, cron ativo |

## O que está no disco e NÃO no ar

- **`secoes_extras` e `rubrica_ia`**: as colunas existem em PROD e estão **vazias** nas duas
  vagas. Falta renderizar as seções na página e escrever as duas rubricas.
- **A migration `…0018`** ainda não commitada.

---

## A fila, na ordem combinada

### 1 · Escrever a `rubrica_ia` das duas vagas
O deploy e os prompts já saíram (acima). Falta só a rubrica.

⚠ **Agora ela pesa mais do que pesava.** O prompt real de `cv_job_match` manda pontuar
"cada competência crítica **fornecida pela vaga**" em BARS 1-5. Sem `rubrica_ia`, a EF cai no
fallback — `descricao_curta` + `sobre_cargo` + `requisitos_*`, que é **cópia de divulgação**.
É por aí que entram na avaliação sinais que ninguém decidiu que pesariam: a vaga de pré-vendas
diz "operação enxuta" e "ambição saudável", e nada disso deveria discriminar candidato.
O flag `vaga_sem_rubrica_deliberada` marca exatamente esse estado, e hoje ele acende nas duas.

Vale escrever com cuidado e discutir antes.

### 2 · Renderizar `secoes_extras` na página da vaga
Usar o `TextoRico` que já existe. As sete seções dos PDFs que não couberam em campo nenhum
(indicadores, rotina, plano de carreira, remuneração, ferramentas, «o que a vaga NÃO é»,
processo seletivo) migram para lá.

### 3 · O plugin de cadastro de vaga
**Outra conversa, com handoff próprio:** `.planning/HANDOFF-plugin-cadastro-de-vaga.md`.
⚠ Ele manda invocar **`skill-creator`** e **`plugin-builder`**, e rodar **`skill-analyzer`**
depois. Não improvisar.

### 4 · Dados de teste para avaliar as análises de IA
A EF e os prompts já estão sãos, então **agora isto mede o sistema, não o modelo** — mas o
ideal continua sendo esperar a `rubrica_ia` do item 1, senão você mede o fallback.
Fazer numa **terceira vaga não publicada**, para o funil real nascer limpo — candidato
sintético misturado com real polui métricas, comparativo e o snapshot de viés.

ℹ **As análises antigas em `analise_candidato_vaga` não valem nada** e não devem servir de
baseline: todas rodaram sem vaga e sem prompt. As duas de teste reprocessadas nesta sessão
(`a111296a…` e `4dc31256…`) são as únicas com o sistema íntegro.

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

## Duas lições da sessão da noite

4. **Saída válida não é evidência de critério.** A análise gravava `status='sucesso'` e
   `score_match=75` com o system prompt vazio. O schema Zod é enforced, então a FORMA da saída
   estava perfeita — e a forma perfeita foi justamente o que escondeu o conteúdo ausente por
   meses. Todo painel verde que só olha "rodou / não rodou" tem esse ponto cego. O 75 virou 2
   quando o critério chegou.
5. **Defeito silencioso de configuração tem irmãos — varra a família, não o caso.** O bug da
   sessão anterior (EF pedindo coluna inexistente, erro descartado) e este (prompt placeholder
   servido como instrução) são o MESMO padrão: um valor de placeholder/erro que o código aceita
   sem reclamar. Achado o primeiro, a pergunta certa não é "está consertado?" e sim *"onde mais
   existe um valor-sentinela que ninguém verifica?"*. Uma consulta de uma linha
   (`system_template LIKE '[SEED PLACEHOLDER]%'`) achou 3 em produção.
