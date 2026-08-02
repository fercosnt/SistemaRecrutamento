/**
 * EditarJanelaDialog — a edição da janela de retenção de um estado (RETEN-02).
 *
 * ⚠ ESQUELETO DO RED (plano 43-09, Task 2). Assinatura FINAL, corpo vazio — o RED desta
 * fase é expresso em RUNTIME e não em compilação (ver a nota do 43-08 e o hook de
 * pre-commit congelado em 97).
 *
 * @module features/admin/retencao/components/EditarJanelaDialog
 */
import type { LinhaMatriz } from './MatrizRetencaoTable'

export interface EditarJanelaDialogProps {
  /** A linha da matriz em foco. `null` fecha o diálogo sem renderizar conteúdo. */
  linha: LinhaMatriz | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditarJanelaDialog(_props: EditarJanelaDialogProps) {
  return null
}
