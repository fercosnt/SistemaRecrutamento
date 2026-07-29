# Passivo de pedidos de revisão — Art. 20 da LGPD

| Campo | Valor |
|-------|-------|
| **Requirement coberto** | **REVISAO-06** |
| **Decisão de origem** | D-P42-19 — o número é entregue **antes de qualquer tela** |
| **Data de coleta** | **2026-07-29** (`2026-07-29 13:48:23 UTC`) |
| **Query reprodutora** | [`docs/compliance/sql/03-art20-backlog.sql`](./sql/03-art20-backlog.sql) |
| **Ambiente** | PROD (`isljnozzlvckrgjjbjwp`) |
| **Natureza da coleta** | Read-only — nenhum statement de escrita |

---

## Resultado

| Métrica | Valor |
|---------|-------|
| **Pedidos de revisão pendentes** | **1** |
| Pedidos de revisão solicitados (total histórico) | 1 |
| Pedido pendente mais antigo | `2026-06-26 21:01:33-03` |
| Maior espera — **dias de calendário** (canônico) | **33** |
| Maior espera — dias de intervalo (24 h completas) | 32 |
| Decisões distintas entre os pendentes | 1 |

### O que este número significa

> ### ⚠ CORREÇÃO (2026-07-29, mesma data) — o pedido pendente é de uma CONTA DE TESTE
>
> A primeira versão deste artefato afirmava que havia **"uma pessoa real esperando há 33 dias"**.
> **Isso está errado.** A verificação de a quem pertence a linha foi feita depois, e o pedido é da
> conta `candidato.funil@teste.com` — conta de teste do próprio projeto, não candidato real.
>
> A afirmação original foi escrita sem checar o titular. Registrar como fato uma afirmação não
> verificada dentro de um artefato de compliance é exatamente a classe de defeito que este
> milestone existe para eliminar, e a correção fica aqui em vez de o erro ser apagado do histórico.

**O passivo REAL de candidatos é zero nesta data.** O único pedido de revisão pendente em PROD
pertence a uma conta de teste, registrado em 26/06/2026, com `revisao_resultado` ainda `NULL`.

Isso **não** esvazia o achado, mas muda o que ele prova:

- **O que continua verdadeiro:** o mecanismo do "cai no vazio" é real e está demonstrado. Um pedido
  foi gravado por `solicitar_revisao_decisao`, ficou 33 dias sem resposta, e **não havia superfície
  alguma onde ele pudesse ser visto**. Se um candidato real tivesse pedido, teria tido o mesmo
  destino.
- **O que NÃO é verdadeiro:** que exista hoje um titular real prejudicado. Não existe.
- **O que isso remove:** a urgência de reparação individual. Não há ninguém a quem responder com
  atraso.
- **O que isso preserva:** a urgência da fase. O buraco é estrutural, não incidental — a ausência
  de passivo real é sorte de timing (o produto ainda tem pouquíssimo volume), não desenho.

**Consequência operacional para a validação:** a fila **não** nascerá vazia — o item de teste
aparecerá, com 33+ dias e badge no pior patamar. Quem validar deve esperar exatamente 1 item e
saber que ele é sintético. Uma fila vazia na primeira abertura seria defeito de leitura; uma fila
com 1 item é o estado correto.

---

## Dimensionamento

O passivo medido é **1**, contra o `LIMIT 200` server-side de `listar_revisoes_decisao` (plano
42-06) e o cap de scroll da tabela (plano 42-09).

- **Folga: 199 linhas (99,5 % do cap).**
- O cap deixa de ser um número inventado e passa a ter fundamento medido.
- **Não** há achado bloqueante: o passivo está três ordens de grandeza abaixo do cap.

O aviso de corte previsto para quando a leitura atingir 200 linhas permanece necessário — não pelo
volume de hoje, mas porque o volume de hoje só é baixo enquanto não existe fila. Uma vez que o RH
comece a receber e responder, o regime muda.

---

## ⚠ Nota de predicado (obrigatória)

**"Pendente" foi medido nesta data como:**

```sql
revisao_solicitada_em IS NOT NULL AND revisao_resultado IS NULL
```

porque `revisao_respondida_em` **ainda não existia** em 2026-07-29 — ela nasce na migration do plano
42-06.

**A partir dessa migration, o predicado canônico passa a ser:**

```sql
revisao_solicitada_em IS NOT NULL AND revisao_respondida_em IS NULL
```

e é **esse** que a fila usa. Qualquer re-medição posterior **tem** de usar a segunda forma. Medir o
"depois" com o predicado do "antes" faria as duas contagens medirem coisas diferentes em silêncio, e
a comparação que dá sentido a este fato datado viraria ruído. As duas formas estão escritas no
arquivo `.sql` justamente para que isso não dependa da memória de ninguém.

## ⚠ Nota de unidade — duas semânticas de "dias de espera"

As duas formas divergem em **1 dia** sobre a mesma linha (32 vs 33). Nenhuma está errada; são
definições distintas:

| Forma | Expressão | Valor hoje | Definição |
|-------|-----------|-----------:|-----------|
| **Calendário (canônica)** | `now()::date - ts::date` | **33** | Fronteiras de dia-calendário cruzadas |
| Intervalo | `EXTRACT(day FROM now() - ts)` | 32 | Períodos completos de 24 h decorridos |

**A semântica canônica desta fase é a de calendário**, porque é a que o `42-CONTEXT.md` trava para a
fila (*"dias corridos inteiros"*, `date-fns differenceInCalendarDays`) e portanto a que o badge de
acompanhamento exibe ao RH.

A consulta originalmente proposta em `42-RESEARCH.md` §E9 usava a forma de **intervalo**. A
divergência só apareceu ao executar as duas contra PROD lado a lado. Ficou registrada aqui e no
próprio `.sql` porque um artefato dizendo "32" enquanto a tela diz "33" é precisamente a classe de
inconsistência silenciosa que este milestone existe para eliminar.

---

## Como reproduzir

Executar o conteúdo de [`sql/03-art20-backlog.sql`](./sql/03-art20-backlog.sql) via `execute_sql` do
MCP do Supabase, contra o projeto `isljnozzlvckrgjjbjwp`, pelo **orquestrador / main thread** —
subagentes GSD não recebem os tools MCP do Supabase.

A execução é **read-only e segura em PROD**: o arquivo é verificado por gate automatizado contra
qualquer verbo de escrita (`INSERT`/`UPDATE`/`DELETE`/`DROP`/`ALTER`/`CREATE`/`TRUNCATE`/`GRANT`/
`REVOKE`) fora de comentário.

---

## Limites deste artefato

1. **Conta linhas de `decisao_final`.** Não diz nada sobre pedidos que o candidato *tentou* fazer e
   que não viraram linha: `solicitar_revisao_decisao` é idempotente e **não registra tentativa**.
   Um candidato que clicou cinco vezes aparece uma vez; um candidato barrado por qualquer motivo não
   aparece nenhuma.
2. **Não mede intenção.** Um `revisao_solicitada_em` preenchido prova que houve pedido, não que o
   candidato ainda deseja a revisão 33 dias depois.
3. **Nenhum identificador.** Por desenho, este arquivo carrega apenas agregados. `candidatura_id` e
   `por_usuario` existem no resultado da consulta (b) e **não** atravessam para cá — o arquivo é
   versionado no Git.
4. **Fato datado, não monitoramento.** Este número descreve 2026-07-29. Ele não se atualiza sozinho e
   não deve ser citado como estado atual em data futura sem re-execução.
