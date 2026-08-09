/**
 * ⚠ ESQUELETO DE RED (Phase 47 / Plano 47-04 Task 1).
 *
 * O portão de pre-commit deste repositório é a CONTAGEM de erros de `tsc --noEmit`
 * congelada em 97, e um teste que importa um módulo inexistente eleva essa contagem —
 * ou seja, um RED "arquivo ausente" só seria commitável com `--no-verify`, que é
 * proibido pelo portão do M8. Então o RED aqui é de COMPORTAMENTO, não de compilação:
 * as declarações existem para o tipo fechar, e nenhuma delas faz o que promete.
 *
 * O commit seguinte (GREEN) substitui este arquivo inteiro.
 */

export interface Subprocessador {
  readonly nome: string
  readonly recebe: string
  readonly finalidade: string
  readonly pais: string
  readonly baseLegal: string
}

export const PAIS_POR_MEDIR = '__PAIS_POR_MEDIR__'

export const LISTA_MEDIDA_EM = ''

export const SUBPROCESSADORES: readonly Subprocessador[] = []

export function validarEntradaSubprocessador(entrada: Subprocessador): Subprocessador {
  return entrada
}

export function validarSubprocessadores(
  lista: readonly Subprocessador[],
): readonly Subprocessador[] {
  return lista
}
