---
id: 43-updated-at-do-consentimento-vem-do-cliente
created: 2026-08-02
source: Phase 43 code review (WR-07), confirmado por leitura do sitio de escrita
priority: medium
resolves_phase: 46
tags: [lgpd, consentimento, timestamp, trigger, consent-04, prova, m8-consent]
---

# A data que a tela apresenta como registro da revogacao vem do relogio do navegador

**Achado:** code review da Phase 43, finding WR-07.

## O defeito

`privacidadeService.revogarMarketing` carimba `updated_at` no cliente:

```ts
.update({
  autorizacao_marketing_vagas: novoValor,
  updated_at: new Date().toISOString(),   // <- relogio do navegador
})
```

E essa coluna nao e um detalhe de auditoria interna: e **exatamente** a coluna que a
tela renderiza como afirmacao datada de registro. `ConsentimentoSwitchRow` mostra
`Desativado em {formatarDataPtBr(confirmadoEm)}`, e `confirmadoEm` e `updated_at`.

Um relogio torto — ou deliberadamente alterado — data a propria revogacao, e a tela
apresenta isso como fato. Numa fase cuja tese e *o registro nao pode afirmar o que a
pessoa nao fez*, um timestamp de consentimento autorado pelo cliente e a direcao
errada.

O `20260802000001` (CR-01) fechou a forja das colunas de PROVA, mas deixou
`updated_at` na allowlist de escrita do titular — de proposito, porque o cliente a
envia na mesma chamada. Ou seja: o titular ainda escolhe o valor desta coluna.

## Por que NAO foi corrigido no code review

A correcao certa e de BANCO, e a rodada de fixes do review era declaradamente
zero-toque no banco:

```sql
CREATE TRIGGER trg_autorizacoes_atualizado_em
  BEFORE UPDATE ON public.autorizacoes
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();  -- funcao viva da P37
```

E **remover a linha do cliente sem o trigger seria pior que o defeito atual**: sem
carimbo nenhum, `updated_at` ficaria congelado no valor do INSERT, e a tela passaria
a datar a revogacao com a data do CADASTRO. Uma data errada e mais convincente que
uma data suspeita. As duas metades tem de andar juntas.

## O que fazer, na ordem

1. Aplicar o trigger acima (aditivo, reversivel por `DROP TRIGGER`). Conferir antes
   que `public.tocar_atualizado_em()` e mesmo a funcao viva da P37 e que o nome da
   coluna que ela toca e `updated_at` nesta tabela — o idioma do projeto tem tabelas
   com `atualizado_em` e tabelas com `updated_at`, e o arquivo nao e o objeto vivo.
2. No MESMO commit, remover `updated_at` do payload de `revogarMarketing` e manter a
   coluna so na allowlist de LEITURA.
3. `REVOKE UPDATE (updated_at) ON public.autorizacoes FROM authenticated` — depois de
   (2), e so depois, senao a revogacao do CONSENT-04 morre com `42501`. A assercao (c)
   do bloco de auto-verificacao do `20260802000001` exige hoje o privilegio oposto e
   tem de ser atualizada junto.
4. Smoke: revogar com um JWT de candidato e provar que o `updated_at` resultante esta
   dentro de uma janela de segundos do `now()` do servidor — nao que ele "mudou".

## Pergunta em aberto que a UI-SPEC nao resolve

Se a data de revogacao passa a ser server-side, vale a pena guardar TAMBEM a data da
CONCESSAO? Hoje `ativoDesde` e `desativadoEm` leem a MESMA coluna `updated_at`, entao
o sistema so sabe datar o ultimo ato, nunca o historico. Uma linha de trilha por
mudanca de consentimento (append-only) responderia as duas — e e o que um pedido de
titular sobre "desde quando eu autorizei isso" vai exigir. Decisao de politica,
pertence a fase que tratar de trilha de consentimento.
