/**
 * ConsentimentoSwitchRow — a linha de um consentimento REVOGÁVEL (CONSENT-04).
 *
 * ⚠ ESQUELETO RED (Task 1 do plano 43-08). Renderiza `null` de propósito: o ciclo TDD
 * exige um commit em que a suíte deste componente REPROVA. A implementação chega no
 * commit GREEN seguinte.
 *
 * @module features/privacidade/components/ConsentimentoSwitchRow
 */

/** Copy verbatim da 43-UI-SPEC §`/candidato/privacidade` (linhas 480-490). */
export const COPY_CONSENTIMENTO_MARKETING = {
  rotulo: 'Avisos sobre novas vagas',
  corpo:
    'Receber por e-mail avisos sobre novas oportunidades na Beauty Smile, mesmo fora de um processo seletivo.',
  ativoDesde: (data: string) => `Ativo desde ${data}`,
  desativadoEm: (data: string) => `Desativado em ${data}`,
  desativado: 'Desativado',
  emVoo: 'Salvando…',
  erroTitulo: 'Não foi possível salvar esta mudança.',
  erroCorpo: 'Sua autorização continua como estava. Tente novamente.',
} as const

export interface ConsentimentoSwitchRowProps {
  /** id do controle, para o `htmlFor` do `Label`. */
  id: string
  rotulo: string
  corpo: string
  /** Estado CONFIRMADO pelo servidor. `null` = nunca autorizado (BD-5). */
  valor: boolean | null
  /** Timestamp ISO da última confirmação do servidor, para o rótulo de estado. */
  confirmadoEm: string | null
  /** Escrita em voo — o controle fica desabilitado e NUNCA mostra o estado desejado. */
  pendente: boolean
  /** `true` quando a última escrita falhou: alerta inline abaixo da linha. */
  erro: boolean
  onAlternar: (novoValor: boolean) => void
}

export function ConsentimentoSwitchRow(_props: ConsentimentoSwitchRowProps) {
  return null
}
