/**
 * janelaRetencaoSchema — a validação da janela de retenção em meses (RETEN-02).
 *
 * ⚠ ESTE ARQUIVO É COSMÉTICO, E DIZÊ-LO EM VOZ ALTA É O PONTO.
 *
 * O teto de 24 meses **não** é imposto aqui. Quem impede de verdade são DUAS camadas de
 * servidor, ambas provadas por execução no smoke do 43-07 (10/10):
 *
 *   1. `CHECK (janela_meses BETWEEN 1 AND 24)` em `public.config_retencao_etapa`;
 *   2. a validação dentro de `public.salvar_janela_retencao`, que recusa com **22023**
 *      `p_meses` NULL, `p_meses` fora de `1..24`, etapa ausente da matriz **e NO-OP**
 *      (salvar o valor que já está lá).
 *
 * Se esta validação de cliente for removida um dia, a RPC continua recusando — e é essa
 * ordem que importa. O inverso não é verdade: uma checagem que só existe na tela é uma
 * checagem que qualquer DevTools desliga. Mesmo modelo mental do `D-13` da `RHSidebar` e
 * do espelho `pode_responder` do guard REVISAO-05 (Phase 42).
 *
 * O que ESTA camada entrega, e é legítimo: uma mensagem em pt-BR **antes** da ida à rede,
 * para que o operador corrija o valor sem receber de volta um `22023` opaco.
 *
 * ⚠ AS MENSAGENS SÃO VERBATIM DA 43-UI-SPEC (§Diálogo "Editar janela de retenção",
 * linhas 546-560). Reescrevê-las é reescrever o contrato, não melhorar a redação.
 *
 * @module features/admin/retencao/schemas/janelaRetencaoSchema
 * @see supabase/migrations/20260801000002_p43_config_retencao.sql (o CHECK e a RPC — o controle real)
 */
import { z } from 'zod'

/** O piso e o teto — espelho COSMÉTICO do `CHECK` da tabela e do guard da RPC. */
export const JANELA_MESES_MIN = 1
export const JANELA_MESES_MAX = 24

/** Copy verbatim da 43-UI-SPEC — fonte única, sem deriva. */
export const COPY_JANELA = {
  erroAcimaDoTeto: `A janela não pode passar de ${JANELA_MESES_MAX} meses. Esse é o teto consentido pela copy do cadastro.`,
  erroVazioOuNaoPositivo: 'Informe um número de meses maior que zero.',
} as const

/**
 * O schema do valor já convertido em número.
 *
 * A conversão vive fora (`validarJanela`) de propósito: o campo é um `<input>` de texto, e
 * `""` precisa cair na mensagem de "maior que zero" — não na mensagem de tipo do Zod, que
 * é técnica e não está no contrato de copy.
 */
export const janelaRetencaoSchema = z
  .number({
    required_error: COPY_JANELA.erroVazioOuNaoPositivo,
    invalid_type_error: COPY_JANELA.erroVazioOuNaoPositivo,
  })
  .int(COPY_JANELA.erroVazioOuNaoPositivo)
  .min(JANELA_MESES_MIN, COPY_JANELA.erroVazioOuNaoPositivo)
  .max(JANELA_MESES_MAX, COPY_JANELA.erroAcimaDoTeto)

export interface ResultadoValidacaoJanela {
  /** O valor convertido, ou `null` quando a entrada não é um inteiro utilizável. */
  meses: number | null
  /** A mensagem pt-BR a exibir sob o campo, ou `null` quando o valor é válido. */
  erro: string | null
}

/**
 * Converte e valida o texto do campo.
 *
 * ⚠ A ORDEM DAS RECUSAS IMPORTA: um texto vazio, não-numérico ou não-inteiro cai na
 * mensagem de "maior que zero" ANTES de o Zod ver um `NaN` — senão o operador receberia
 * a mensagem de tipo do Zod, que não está no contrato de copy da UI-SPEC.
 */
export function validarJanela(texto: string): ResultadoValidacaoJanela {
  const limpo = texto.trim()
  if (limpo === '') return { meses: null, erro: COPY_JANELA.erroVazioOuNaoPositivo }

  // `Number('12abc')` é NaN, mas `Number(' ')` é 0 — o trim acima já tratou o segundo.
  const bruto = Number(limpo)
  if (!Number.isFinite(bruto) || !Number.isInteger(bruto)) {
    return { meses: null, erro: COPY_JANELA.erroVazioOuNaoPositivo }
  }

  const resultado = janelaRetencaoSchema.safeParse(bruto)
  if (!resultado.success) {
    return { meses: bruto, erro: resultado.error.issues[0]?.message ?? COPY_JANELA.erroVazioOuNaoPositivo }
  }
  return { meses: resultado.data, erro: null }
}
