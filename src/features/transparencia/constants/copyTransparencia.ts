/**
 * ⚠ ESQUELETO DE RED (Phase 47 / Plano 47-04 Task 2) — ver a nota do RED da Task 1:
 * o portão de pre-commit é de CONTAGEM de erros de `tsc`, então o RED aqui é de
 * comportamento, não de compilação. O commit GREEN substitui este arquivo.
 */

export const COPY_TRANSPARENCIA = {
  subprocessadores: {
    h1: '',
    subtitulo: '',
    carimboPrefixo: '',
    rotulos: { recebe: '', finalidade: '', pais: '', baseLegal: '' },
    linkPrivacidade: '',
  },
} as const

export function formatarDataPtBr(_iso: string): string {
  return ''
}
