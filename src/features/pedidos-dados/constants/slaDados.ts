/**
 * Faixas de acompanhamento da fila de pedidos de cópia de dados (EXPORT-05).
 *
 * ⚠ ESTE ARQUIVO NÃO TEM LÓGICA, E ISSO É A DECISÃO — não uma economia de digitação.
 * Ele apenas renomeia, para o vocabulário desta fase, os símbolos já vivos da fila de
 * revisão. `classifySlaDados` **é** `classifyRevisaoSla`: a mesma referência de função,
 * provada por `expect(classifySlaDados).toBe(classifyRevisaoSla)` no teste irmão.
 *
 * ── POR QUE A FUNÇÃO É COMPARTILHADA SE AS TABELAS DE CONFIG SÃO SEPARADAS ─────
 * A pergunta aparece sozinha na primeira leitura, então a resposta mora aqui. A Área 4
 * do 44-CONTEXT separou o **dado** (`config_sla_dados` × `config_sla_revisao`), porque
 * são dois prazos legais distintos e dois prazos não cabem numa linha de configuração.
 * Ela **não** separou a **função**: um classificador total de três faixas mais a faixa
 * degenerada é agnóstico ao prazo — ele recebe os limiares como argumento e não sabe
 * nem quer saber de que tabela vieram. Duplicá-lo criaria um segundo lugar onde a
 * faixa degenerada pode apodrecer, e a divergência apareceria primeiro justamente no
 * caminho que ninguém testa à mão: a configuração ilegível.
 *
 * ── O TETO DE 15 DIAS NÃO APARECE AQUI, E A AUSÊNCIA É DELIBERADA ──────────────
 * O Art. 19, II fixa 15 dias corridos para responder a um pedido de acesso. Isso é
 * **teto legal**, não limiar de atenção — e por isso não existe constante numérica
 * alguma neste arquivo. Os limiares (7 e 12 no seed do 44-02) vivem na TABELA,
 * alteráveis sem deploy, escolhidos abaixo do teto para avisar antes do fim; um alerta
 * que dispara no dia do vencimento é constatação, não alerta. E a ANPD pode dispor
 * prazo diferenciado por setor (Art. 19 §4º) — um número compilado aqui viraria mentira
 * silenciosa no dia em que isso acontecesse.
 *
 * ⚠ `LimiaresSlaDados` é um alias de TIPO, jamais uma interface redeclarada. Uma
 * redeclaração estrutural deixaria a asserção de identidade verde (ela é sobre a
 * função) e ainda assim reintroduziria um segundo lugar onde o formato do limiar pode
 * divergir do que a tabela devolve.
 *
 * @module features/pedidos-dados/constants/slaDados
 * @see src/features/revisao/constants/slaRevisao.ts (a origem — toda a lógica vive lá)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Faixas do badge de acompanhamento)
 */
export {
  classifyRevisaoSla as classifySlaDados,
  diasEmEspera,
  ROTULOS_FAIXA_SLA_REVISAO as ROTULOS_FAIXA_SLA_DADOS,
} from '@/features/revisao/constants/slaRevisao'

export type {
  LimiaresSlaRevisao as LimiaresSlaDados,
  FaixaSlaRevisao,
} from '@/features/revisao/constants/slaRevisao'
