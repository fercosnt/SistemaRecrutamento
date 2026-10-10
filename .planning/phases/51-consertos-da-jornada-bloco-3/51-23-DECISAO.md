decisao: apagar
migration: 20261010000002
alvo_md5_aprovado: 6819cb8d99bbaaae5de23cefae2c88bd
linhas_aprovadas: 2
com_disp_aprovados: 2
titulares_medidos: 2
aprovado_em: 2026-10-10 03:20 -0300 (aproximado — ver «Horário» abaixo)

# 51-23 — OK do operador para a limpeza destrutiva (G1a, parte destrutiva)

## Resposta do operador

VERBATIM (mensagem digitada pelo operador ao orquestrador, nesta sessão, em 2026-10-10, antes de dormir):

> «autorizo a limpeza se a medição de agora der 2 titulares / 2 linhas e o alvo for 6819cb8d…»

Contexto em que ela foi dada: o orquestrador tinha acabado de mostrar ao operador a evidência do 51-21,
`g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual,alvo=6819cb8d99bbaaae5de23cefae2c88bd`,
e ofereceu exatamente esta forma condicional. O operador respondeu com ela.

**Foi uma pré-autorização CONDICIONAL**, dada antes da medição fresca da Task 1. O operador não viu os números
desta medição. Ela só vale porque a condição dele foi conferida por máquina contra a medição fresca. O orquestrador
tornou a condição mais estrita do que o texto literal, e o executor a aplicou assim:

- `titulares` = 2, `com_disp` = 2 e `linhas` = 2;
- `alvo_md5` = `6819cb8d99bbaaae5de23cefae2c88bd`, o valor inteiro, e o prefixo `6819cb8d` do operador também bate;
- o ensaio da Task 1 está verde e a sua evidência `g1l:` é igual à medição (`apagadas=2,restantes=0,outros=igual`), sem `PERSISTIU`;
- o motor G1a está no ar: o ledger tem `20261010000001`, o md5 do motor vivo é `9b87e5ee3d072df5f9bf6e99ee1ae7c1`, e o ledger NÃO tem `20261010000002`.

Se qualquer item falhasse, este arquivo não existiria e o plano pararia num checkpoint.

## Conferência por máquina que satisfez a condição

O script `gate51_23.cjs` roda só leitura. Ele lê a medição COMMITADA (`git show HEAD:…/51-23-POPULACAO.json`, commit
`f921a2a2`), o log do ensaio da Task 1 e o ledger e o `md5(prosrc)` vivo, por `p46apply.cjs sql` com `set transaction read only`.
Saída (rc=0):

```
AUTORIZACAO CONDICIONAL SATISFEITA (2026-10-10T06:22:14.419Z): medicao commitada titulares=2,com_disp=2,linhas=2,alvo_md5=6819cb8d99bbaaae5de23cefae2c88bd · ensaio g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual,alvo=6819cb8d99bbaaae5de23cefae2c88bd sem PERSISTIU · ledger 20261010000001=1, 20261010000002=0 · motor vivo md5=9b87e5ee3d072df5f9bf6e99ee1ae7c1
```

Também foi feita uma prova de que a conferência morde. Ela foi rodada contra uma cópia do log com `apagadas=1` e recusou (rc=1):
`AUTORIZACAO CONDICIONAL NAO SATISFEITA (…): g1l fora de apagadas=2,restantes=0,outros=igual: …apagadas=1…`.

## Números aprovados (= `51-23-POPULACAO.json`, medido em 2026-10-10T06:21:01.050Z)

| titulares | com_disp | linhas | alvo_md5 | outros_n (só registro) |
|---|---|---|---|---|
| 2 | 2 | 2 | `6819cb8d99bbaaae5de23cefae2c88bd` | 26 |

O apply só roda se a medição feita no MESMO comando der o mesmo `alvo_md5`, as mesmas `linhas` e o mesmo `com_disp`, e se der
`titulares` ≥ 2. PITR: `pitr_enabled=false`, medido só como informação. A escrita é IRREVERSÍVEL e nenhuma cópia é guardada.

## Horário

O orquestrador informou o horário da mensagem do operador como «~03:25 -0300, aproximado». O relógio da máquina contradiz
esse valor: o despacho deste executor, que veio depois da mensagem, aconteceu às 03:20:45 -0300 pelo relógio da máquina. Então a
mensagem foi enviada até as 03:20 -0300. Este arquivo registra `03:20 -0300` como valor aproximado (limite superior).
O valor exato não foi medido pelo executor.
