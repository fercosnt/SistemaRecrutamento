/**
 * Formatação e aritmética de data da superfície de privacidade do candidato.
 *
 * Existe como módulo próprio porque DUAS superfícies desta feature exibem a mesma data
 * (a linha do switch e o bloco de guarda do currículo) e uma regra de formatação
 * duplicada é uma divergência esperando acontecer — exatamente a classe de defeito que
 * esta fase existe para fechar, um nível abaixo.
 *
 * @module features/privacidade/lib/datas
 */

/**
 * O teto consentido, em meses. É o número que a pessoa LEU E ACEITOU no cadastro
 * ("Autorizo guardar meu currículo por até 2 anos", `consent-text.json`), e é por isso
 * que ele mora aqui e NÃO vem da matriz `config_retencao_etapa` — ver a decisão
 * registrada no docblock de `GuardaCurriculoBloco`.
 */
export const TETO_GUARDA_MESES = 24

/** Formata um timestamp ISO como dd/mm/aaaa (pt-BR) — idioma vivo do `SolicitarRevisaoCTA`. */
export function formatarDataPtBr(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Soma meses a um timestamp ISO e devolve a data em dd/mm/aaaa, ou string vazia quando
 * a entrada não é uma data legível. `setMonth` normaliza o estouro de fim de mês
 * (31/01 + 1 mês = 03/03 em ano comum) — aceito de propósito: a data é um PRAZO
 * PREVISTO comunicado ao titular, não um instante de execução de rotina nenhuma.
 */
export function formatarDataMaisMeses(
  iso: string | null | undefined,
  meses: number,
): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  d.setMonth(d.getMonth() + meses)
  return formatarDataPtBr(d.toISOString())
}
