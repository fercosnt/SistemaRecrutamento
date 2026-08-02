/**
 * MatrizRetencaoTable — a matriz de retenção por estado da candidatura (RETEN-01).
 *
 * ⚠ ESQUELETO DO RED (plano 43-09, Task 1). Assinatura FINAL, corpo vazio: o RED desta
 * fase é expresso em RUNTIME e não em compilação, porque o hook de pre-commit conta erros
 * de `tsc` contra a baseline congelada de 97 e `--no-verify` é proibido nesta fase. Um
 * teste que reprova por módulo inexistente reprovaria o COMPILADOR, não o comportamento.
 *
 * @module features/admin/retencao/components/MatrizRetencaoTable
 */
import type { EtapaFunilM2 } from '@/features/triagem/services/triagemService'

/** Uma linha da tabela — a matriz do servidor MESCLADA com o enum fechado de 8 estados. */
export interface LinhaMatriz {
  etapa: EtapaFunilM2
  rotulo: string
  janelaMeses: number | null
  origem: string | null
  alteradoPorNome: string | null
  atualizadoEm: string | null
  /** `false` quando o estado existe no enum e NÃO existe na matriz. */
  definida: boolean
}

export interface MatrizRetencaoTableProps {
  /**
   * Abre a edição da linha. **Opcional de propósito**: enquanto o diálogo não existe
   * (Task 2), a ação renderiza DESABILITADA em vez de oferecer uma afordância falsa —
   * idioma estabelecido pelo `FilaRevisoesTable` no 42-09.
   */
  onEditar?: (linha: LinhaMatriz) => void
}

export function MatrizRetencaoTable(_props: MatrizRetencaoTableProps = {}) {
  return null
}
