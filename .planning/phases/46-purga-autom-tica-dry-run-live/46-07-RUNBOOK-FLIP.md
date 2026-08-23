# Runbook do flip `dry_run → live` — Phase 46

> Este documento é aberto **duas semanas depois** do fim da Phase 46, por quem vai decidir se a
> purga automática passa a apagar dado de pessoas reais. Ele existe porque um item solto num
> checklist que ninguém relê é a mesma coisa que nenhum item.

**Escrito em:** 2026-08-23, no plano 46-07, **antes** de a purga estar em `dry_run`.
**Estado do sistema quando este arquivo nasceu:** `config_purga.modo = 'off'`, cron
`purga-retencao-sweep` ativo às `0 3 * * *` UTC gravando apenas heartbeat, ledger com 3 execuções,
**todas em `off`**.

⚠ **A decisão que este runbook prepara é a mais irreversível do projeto.** Em `live` a varredura
noturna destrói Storage, Postgres e Auth de titulares reais. Não há PITR (D-45-10) e o Storage está
fora de todo caminho de backup: um currículo apagado é irrecuperável por qualquer meio.

⚠ **Nada aqui é auto-executável por agente.** Passo que apaga dado de forma irreversível não é
executado por agente por conta própria — o agente para e pergunta, e quem autoriza é o operador,
explicitamente, na sessão. Foi assim na Phase 45, em 2026-08-22, e o portão foi **satisfeito**, não
contornado.

---

## T0 e a contagem

**`T0` = o instante em que `config_purga.modo` passou de `off` para `dry_run`.**

| | |
|---|---|
| `T0` (`now()` do servidor no instante do flip) | **`2026-08-23 02:06:37.866049-03`** ⬅ medido no servidor, no ato |
| Data mínima do flip (`T0 + 14 dias`) | **`2026-09-06 02:06:37-03`** |
| Execuções em `dry_run`/`live` no ledger em `T0` | **2** (a manual do flip + a de 2026-08-22 20:03) — faltam **12** |
| Etapas da allowlist ainda em procedência `seed` | **2** — `aprovado` e `decisao_final`. ⚠ **Ação do operador em `/admin/retencao`**, e ela não passa pelo tempo: confirmar a janela de cada uma marca a procedência como escolhida por um administrador. Sem isso o servidor recusa o `live` mesmo depois dos 14 dias |

⚠ **NÃO CONFIE NA LINHA ACIMA — ELA É CONVENIÊNCIA, NÃO FONTE.** A lição do 42-12 é que um marco
temporal que depende de alguém lembrar de anotá-lo não existe. `T0` é **recuperável do banco**, e é
a consulta abaixo que manda:

```sql
-- T0 recuperado da trilha de auditoria: a primeira mudanca de modo cujo destino
-- foi dry_run. Ela nao depende de transcricao nenhuma.
SELECT l.created_at                          AS t0,
       l.created_at + interval '14 days'     AS t0_mais_14_dias,
       l.usuario_id                          AS quem_ligou,
       l.dados_antes  ->> 'modo'             AS modo_antes,
       l.dados_depois ->> 'modo'             AS modo_depois
  FROM public.logs_auditoria l
 WHERE l.acao = 'alterar_config_purga'
   AND l.dados_depois ->> 'modo' = 'dry_run'
 ORDER BY l.created_at
 LIMIT 1;
```

⚠⚠ **E O RELÓGIO QUE O SERVIDOR CONFERE NÃO É EXATAMENTE ESSE.** A RPC conta os 14 dias a partir de
`min(iniciada_em)` das execuções do ledger **em `dry_run` ou `live`** — não a partir do instante do
flip, e **não** a partir do primeiro heartbeat em `off`. Na prática os dois marcos ficam a minutos
de distância, porque o passo 7 da Task 3 roda uma varredura manual logo depois do flip. Se por
algum motivo essa varredura manual não tiver acontecido, o relógio do servidor começa na primeira
execução noturna do cron — **até um dia depois de `T0`**.

**Onde a contagem está hoje** — esta é a consulta que responde, e ela mede exatamente o que a RPC
mede:

```sql
SELECT count(*)                                            AS execucoes_de_ensaio,
       min(iniciada_em)                                    AS primeira_execucao_de_ensaio,
       floor(extract(epoch FROM (now() - min(iniciada_em))) / 86400)::int
                                                           AS dias_corridos,
       count(*) FILTER (WHERE elegiveis > 0)               AS sobre_conjunto_nao_vazio,
       max(iniciada_em)                                    AS ultima_execucao_de_ensaio
  FROM public.purga_execucoes
 WHERE modo_vigente IN ('dry_run', 'live');
```

⚠ **Execuções em `off` NÃO CONTAM, e a exclusão é deliberada.** Em `off` a varredura conta os
elegíveis, grava o heartbeat e **retorna antes de qualquer item** — ela não ensaia nada. Se os
heartbeats de `off` contassem, catorze noites com a purga desligada satisfariam o portão e
autorizariam `live` com zero evidência de ensaio. Isso não é hipótese: em 2026-08-23 as três linhas
vivas do ledger estavam em `off`, e uma delas já registrava `elegiveis = 4`.

---

## As cinco pré-condições do servidor

Todas conferidas pela RPC `public.salvar_config_purga`, no servidor, **em toda chamada**. Nenhuma
depende de alguém ler este documento — este documento existe para que a **mensagem** de recusa seja
interpretável sem abrir o código.

| # | Pré-condição | O que a mensagem de recusa diz quando ela falta |
|---|---|---|
| 1 | ≥ 14 dias corridos desde a primeira execução de **ensaio** | `dias corridos desde a primeira execucao em dry_run ou live = N (exigido 14; ...)` |
| 2 | ≥ 14 execuções de ensaio com linha no ledger | `execucoes com linha no ledger em dry_run ou live = N (exigido 14)` |
| 3 | ≥ 1 execução de ensaio sobre conjunto elegível **não-vazio** | `execucoes de ensaio sobre conjunto elegivel NAO-VAZIO = N (exigido ao menos 1; ...)` |
| 4 | Nenhuma etapa da allowlist em `origem = 'seed'` (D-46-22) | `etapas da allowlist ainda em procedencia de seed = N [nomes] (exigido nenhuma; ...)` |
| 5 | Argumento explícito de confirmação | `ligar a purga em modo live exige confirmacao EXPLICITA — o argumento de confirmacao veio [...]` |

⚠ **A recusa nomeia TODAS as que faltam de uma vez** (exceto a nº 5, que é conferida antes das
outras e corta o caminho). Se a mensagem citar quatro critérios, quatro faltam.

⚠ **Há uma sexta condição, e ela é uma guarda contra vacuidade:** a allowlist não pode estar
**vazia**. Com `elegivel_purga` falso em toda linha, "zero etapas em seed" seria verdade por
ausência de sujeito, e o portão aprovaria o flip de uma purga que não alcança estado nenhum.
Mensagem: `etapas com elegivel_purga verdadeiro = 0 (...)`.

### As consultas, uma por pré-condição

**1, 2 e 3 — os três critérios de D-46-14**, na mesma consulta da seção anterior:

```sql
SELECT count(*)                              >= 14 AS ok_2_execucoes,
       count(*) FILTER (WHERE elegiveis > 0) >=  1 AS ok_3_conjunto_nao_vazio,
       coalesce(min(iniciada_em) <= now() - interval '14 days', false)
                                                   AS ok_1_quatorze_dias,
       count(*)                                    AS execucoes_de_ensaio,
       min(iniciada_em)                            AS primeira_de_ensaio,
       count(*) FILTER (WHERE elegiveis > 0)       AS sobre_conjunto_nao_vazio
  FROM public.purga_execucoes
 WHERE modo_vigente IN ('dry_run', 'live');
```

**4 — a matriz de retenção fora do seed (D-46-22):**

```sql
SELECT etapa, janela_meses, origem, alterado_por, atualizado_em
  FROM public.config_retencao_etapa
 WHERE elegivel_purga
 ORDER BY etapa;
-- As TRES linhas (aprovado, decisao_final, rejeitado) tem de estar em origem = 'admin'.
-- Medido em 2026-08-22: so `rejeitado` estava (18 meses); `aprovado` e `decisao_final`
-- seguiam em seed, 24 meses.
```

⚠ **Um valor em `seed` significa que ninguém CONTESTOU aquele número — não que alguém o DECIDIU.**
O `COMMENT` da coluna declara essa pré-condição dentro do banco desde a Phase 43. Confirmar cada
etapa é decisão de **política**, estado a estado, e se faz pela tela do administrador, que chama
`public.salvar_janela_retencao(etapa, meses)` — é essa RPC que marca `origem = 'admin'`.

⚠ **Confirmar a janela NÃO é o mesmo que marcá-la como elegível.** Reconfirmar 24 meses é uma
escolha legítima; o que não pode acontecer é ligar a purga sobre um número que ninguém olhou.

**5 — a confirmação:** é o quarto argumento da chamada. Ver a §"Se algo der errado" para a forma
exata.

**A prova de que o portão está fechado agora**, sem efeito colateral nenhum (a RPC recusa antes de
tocar em qualquer coisa):

```sql
-- Como administrador. Enquanto QUALQUER criterio faltar, esta chamada RECUSA com
-- 22023 e a mensagem nomeia o que falta. A recusa E a evidencia.
SELECT public.salvar_config_purga(
  p_modo                      := 'live',
  p_cap_titulares             := NULL,
  p_janela_notificacoes_meses := NULL,
  p_confirmo_live             := true
);
```

---

## As três verificações humanas

O servidor não faz nenhuma destas. Elas são a diferença entre "os critérios batem" e "é seguro".

### 1 · A fixture durável está viva e greppável — e em `live` ela é DESTRUÍDA

```sql
-- O namespace e o unico ponto de entrada da fixture do 46-01.
SELECT count(*) AS contas_de_fixture
  FROM auth.users u
 WHERE u.email LIKE 'fixture-p46+%@invalido.local';

SELECT count(*) AS titulares_elegiveis_hoje
  FROM public.titulares_alem_da_janela();
```

⚠⚠ **É a destruição da fixture que é a prova.** Em `live`, os titulares sintéticos são os primeiros
a serem apagados: Storage, Postgres e a conta do Auth, de forma definitiva. Isso é o desfecho
esperado — **e significa que recriar a fixture antes de cada novo teste em `live` é custo orçado,
não surpresa.** O script de criação é `supabase/tests/p46_fixture_elegivel.sql`.

### 2 · Nenhum titular REAL está no conjunto elegível no instante do flip

```sql
-- Titular a titular, cruzado contra o namespace da fixture. Toda linha em que
-- `e_fixture` for FALSE e uma PESSOA REAL que sera apagada na primeira noite.
SELECT t.*,
       (u.email LIKE 'fixture-p46+%@invalido.local') AS e_fixture,
       u.email
  FROM public.titulares_alem_da_janela() t
  JOIN public.candidatos  c ON c.id = t.candidato_id
  LEFT JOIN auth.users    u ON u.id = c.user_id
 ORDER BY e_fixture, t.candidato_id;
```

⚠ **A conferência é titular a titular, e não por contagem.** "São 4, como esperado" passa por verde
quando um dos quatro trocou de identidade. Se aparecer um titular real, **pare** — o flip pode
esperar; um currículo apagado não volta.

### 3 · O portão de fase destrutiva está fechado, nos cinco itens

- [ ] `46-VERIFICATION.md` existe **com veredito** — nunca ausente, nunca rascunho
- [ ] Code review bloqueante feito **antes** do apply
- [ ] Asserções negativas registradas e verdes (`p46_purga_smoke.sql` em **27/27**, lido do contador
      do GUC e não de "não levantou")
- [ ] Zero commit sem verificação, zero `--no-verify`
- [ ] O dry-run foi exercitado pela **mesma expressão** do delete real — o ensaio e a destruição
      chamam `public.anonimizar_candidato` com o mesmo predicado, e não com duas cópias dele

---

## Vigilância durante os 14 dias

O que olhar, com que frequência, e qual sinal significa o quê.

**Diariamente — o heartbeat.** Ausência de linha nova por mais de **36 h** significa cron parado.
Sem esse sinal, "o cron morreu" e "não havia nada a purgar" produzem o mesmo silêncio.

```sql
SELECT id, iniciada_em, concluida_em, modo_vigente, cap_vigente,
       elegiveis, processados, notificacoes_expurgadas, veredito, situacao
  FROM public.purga_execucoes
 ORDER BY iniciada_em DESC
 LIMIT 20;
```

| Sinal | Leitura |
|---|---|
| `veredito = 'dry_run'`, `processados = 0` | ✅ o regime normal do período |
| `elegiveis` estável e igual ao tamanho da fixture | ✅ o predicado continua enxergando o mesmo conjunto |
| `elegiveis` **subiu** | ⚠ um titular real entrou no conjunto — ir à verificação humana nº 2 |
| `elegiveis = 0` | ⛔ a fixture foi removida ou expirou; o critério nº 3 para de ser satisfeito |
| `veredito = 'segredo_ausente'` | ⛔ o Vault perdeu `project_url` ou `edge_invoke_key`; em `live` o despacho não aconteceria |
| `veredito = 'cap_excedido'` | ⛔ o conjunto passou do cap; a execução ABORTOU inteira, e isso é o cerco funcionando |
| `situacao = 'executando'` por mais de 1 h | ⚠ a reconciliação vai abortá-la; investigar antes de o motivo sumir |
| qualquer item com desfecho carimbado fora de `nao_aplicavel` | ⛔ algo tocou os três sistemas fora de `live` |

```sql
-- Nenhum item pode ter desfecho carimbado durante o dry-run.
SELECT i.desfecho_storage, i.desfecho_postgres, i.desfecho_auth, count(*)
  FROM public.purga_execucao_itens i
  JOIN public.purga_execucoes e ON e.id = i.execucao_id
 WHERE e.modo_vigente = 'dry_run'
 GROUP BY 1, 2, 3;
```

**`cron.job_run_details` — como DIAGNÓSTICO, e NUNCA como ledger.** Ela acumula disco, não é limpa
automaticamente e sobrevive ao desagendamento; ela registra que o **job** rodou, não que a
**política** foi aplicada. Quem responde isso é `purga_execucoes`.

```sql
SELECT jobid, runid, status, return_message, start_time, end_time
  FROM cron.job_run_details
 WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'purga-retencao-sweep')
   AND status NOT IN ('succeeded', 'running')
 ORDER BY start_time DESC
 LIMIT 20;
```

---

## Teardown da fixture

**Script:** `supabase/tests/p46_teardown_fixture.sql` — **um único statement**, idempotente, com
verificação de resíduo que levanta exceção se qualquer contagem ficar diferente de zero. Rodado
pelo orquestrador, em **uma única chamada**.

Ordem de remoção (inversa à de criação, já embutida no script):
`retencao_hold → decisao_final → decisao_final_historico → historico_candidatura → candidaturas →
candidatos → vagas → auth.users`.

Ponto de entrada único: o namespace `fixture-p46+%@invalido.local` (e `fixture-p46%` no `titulo`
das vagas, que são o único alvo sem ligação a `auth.users`).

⚠⚠ **NÃO RODE O TEARDOWN ANTES DO FLIP.** Sem a fixture, o conjunto elegível volta a ser vazio por
**aritmética** — a matriz está em 24 meses e o sistema é mais novo que a janela — e o critério nº 3
(`≥ 1 execução sobre conjunto não-vazio`) **para de ser satisfeito**. O portão passaria a recusar
por um motivo que não é o pretendido, e a mensagem mandaria o operador procurar um defeito que não
existe.

**Quando rodar:** depois de o flip ter sido feito e de a primeira execução em `live` ter destruído a
fixture — momento em que o teardown remove apenas o resíduo (`vagas`, e o que não tiver `user_id`).
Ou, se a decisão for `estender-dry-run` indefinidamente, **nunca** — a fixture é PII sintética em
domínio não-roteável, e o custo de mantê-la viva é menor que o de perder o critério nº 3.

⚠ **Antes de decidir deixá-la viva por mais tempo, reconferir contaminação:** nenhuma linha da
fixture pode ter entrado em relatório, painel, KPI ou export que alguém leia como dado real.

---

## Se algo der errado

**Primeiro, e sem justificativa nenhuma: desligue.**

```sql
-- Como administrador. Esta chamada NUNCA e recusada por criterio nenhum, de
-- estado nenhum. Nao exige confirmacao, nao consulta o ledger, nao consulta a
-- matriz de retencao.
SELECT public.salvar_config_purga(
  p_modo                      := 'off',
  p_cap_titulares             := NULL,
  p_janela_notificacoes_meses := NULL,
  p_confirmo_live             := NULL
);
```

⚠ **Um kill switch que pode ser recusado não é um kill switch**, e o momento em que ele mais importa
é exatamente aquele em que algum critério estaria falhando. O portão de cinco critérios é guardado
por "o modo novo é `live`": a transição para `off` não passa por ele.

**As duas únicas coisas que ainda valem para `off`:**

1. **Autorização.** Quem chama tem de ser administrador com conta viva de RH — desligar é ato de
   operador identificado, e fica na trilha como qualquer outra mudança. Isso não é o portão do
   flip; é o controle de acesso da tabela.
2. **Não-op é recusa.** Se a purga **já estiver** em `off` e nada mais mudar, a chamada devolve
   `22023` — e a mensagem diz, com todas as letras, *"a purga JA ESTA desligada ... ISTO NAO E
   FALHA DO KILL SWITCH: o estado que voce queria ja e o estado vigente"*. Ler isso às três da manhã
   e concluir que o desligamento falhou seria o pior desfecho possível deste documento.

⚠ **A TRILHA DEIXOU DE SER UMA TERCEIRA COISA (HI-01 do `46-REVIEW-2.md`, migration
`20260823000014`).** Até aquele conserto, o passo (8) — a gravação em `logs_auditoria` — rodava na
**mesma transação** da mutação, também para `off`. Qualquer falha dele (um rótulo de enum removido
depois do apply, uma constraint nova, um trigger, disco cheio) **revertia o desligamento junto**, e
quem digitou o kill switch às três da manhã recebia um erro com a purga continuando ligada. Hoje,
**e apenas para a transição para `off`**, a falha da trilha é degradada para `WARNING`: o
desligamento vale, e o `WARNING` diz com essas palavras que a trilha é o que falta. Se você vir esse
aviso, **o kill switch funcionou** — o que resta é registrar a mudança à mão. Para `→ live` a trilha
continua atômica: ligar destruição irreversível sem registro é pior que não ligar.

### Último recurso: se **qualquer** chamada de RPC falhar

Se a RPC não estiver alcançável de jeito nenhum — erro de conexão, função sumiu, papel sem
`EXECUTE`, `logs_auditoria` quebrada de um jeito que a degradação acima não cobre — **desarme o
gatilho em vez do cerco**:

```sql
-- Desarma o AGENDAMENTO sem desagendar. Reversivel com um UPDATE simetrico.
UPDATE cron.job SET active = false WHERE jobname = 'purga-retencao-sweep';

-- Conferir — "nao levantou" nunca foi "gravou":
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'purga-retencao-sweep';
```

⚠ **Prefira isto a `cron.unschedule`.** As duas param a varredura; a diferença está no caminho de
volta. `active = false` é desfeito por `UPDATE ... SET active = true` — um statement, sem migration,
sem tocar no inventário. `cron.unschedule` **destrói a linha**, e reagendar exige reaplicar
`20260823000012_p46_cron.sql`, com o `jobid` mudando e o inventário do INVENT-03 divergindo no
meio-tempo. Às três da manhã, a operação reversível por um statement é a que se escolhe.

⚠ E **isto não substitui o kill switch, complementa-o.** `active = false` impede a varredura de
**começar**; ele não muda `config_purga.modo`, então uma execução que já esteja rodando termina, e
qualquer reativação do job volta ao modo vigente. A ordem correta é: tentar o kill switch primeiro
(ele é o cerco), e só recorrer a isto se a RPC não responder.

**Confirmar que desligou** — porque "não levantou" nunca foi "gravou":

```sql
SELECT modo, cap_titulares, janela_notificacoes_meses, alterado_por, atualizado_em
  FROM public.config_purga;

SELECT created_at, usuario_id, severidade,
       dados_antes ->> 'modo' AS de, dados_depois ->> 'modo' AS para
  FROM public.logs_auditoria
 WHERE acao = 'alterar_config_purga'
 ORDER BY created_at DESC
 LIMIT 5;
```

**Se o desligamento não bastar** — se a suspeita for de que a varredura está apagando o que não
devia, e o modo já está em `off`:

1. Desarmar o job: `UPDATE cron.job SET active = false WHERE jobname = 'purga-retencao-sweep';`
   (ver *"Último recurso"* acima — reversível por um `UPDATE` simétrico).
   Só se for preciso remover a linha de fato: `SELECT cron.unschedule('purga-retencao-sweep');`
   ⚠ Isso deixa o inventário do INVENT-03 divergente do repositório e o
   `p42_invent05_cron_smoke.sql` passa a reprovar **corretamente**. Reagendar é aplicar de novo
   `20260823000012_p46_cron.sql`, com `jobid` novo.
2. Levantar o estrago pelo ledger — ele é a única fonte que sobrevive ao desaparecimento do titular:
   ```sql
   SELECT e.iniciada_em, e.modo_vigente, e.veredito, e.processados,
          i.candidato_id, i.etapa, i.janela_meses_aplicada,
          i.ancora_origem, i.ancora_em,
          i.desfecho_storage, i.desfecho_postgres, i.desfecho_auth
     FROM public.purga_execucoes e
     JOIN public.purga_execucao_itens i ON i.execucao_id = e.id
    WHERE e.modo_vigente = 'live'
    ORDER BY e.iniciada_em DESC, i.criado_em;
   ```
3. ⚠ **Não há restauração.** Sem PITR e com o Storage fora do backup, o ledger responde **o que** foi
   apagado e **sob qual política** — e nada mais. É por isso que os cinco portões do servidor e as
   três verificações humanas existem antes, e não depois.

---

## As três saídas do checkpoint

| Opção | Quando | Custo |
|---|---|---|
| `ligar-live` | As cinco pré-condições do servidor satisfeitas **e** as três humanas conferidas | Destruição irreversível de PII real, limitada pelo cap de 50 titulares por execução e pelo abort integral acima dele |
| `estender-dry-run` | Qualquer dúvida | Só tempo. O ledger continua acumulando evidência e o heartbeat continua provando que o cron vive |
| `ajustar-matriz-antes` | Quando 24 meses genéricos não são a política que se quer executar | Fecha D-46-22 de verdade em vez de só marcar `origem` — mas alarga o conjunto elegível de uma vez, e o cap passa a ser o único cerco |

⚠ **`estender-dry-run` é a escolha barata, e escolhê-la não é indecisão.** A política continuar não
sendo executada custa retenção a mais; ligá-la cedo demais custa dado de pessoas reais que não
volta.
