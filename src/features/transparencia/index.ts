/**
 * Barrel da feature de transparência — as páginas públicas que descrevem o que o
 * sistema faz com dado de candidato.
 *
 * Consumidores: `src/router/routes.tsx` (a rota pública) e, mais adiante, o rodapé de
 * alcançabilidade do plano 47-08 — sem ele a página existe e ninguém a encontra.
 *
 * @module features/transparencia
 */
export { PrivacidadePublicaPage } from './components/PrivacidadePublicaPage'
export type {
  FichaRetencao,
  MatrizPublicada,
  PrivacidadePublicaPageProps,
} from './components/PrivacidadePublicaPage'
export { SubprocessadoresPage } from './components/SubprocessadoresPage'
export type { SubprocessadoresPageProps } from './components/SubprocessadoresPage'
export { SubprocessadorFicha } from './components/SubprocessadorFicha'
export type { SubprocessadorFichaProps } from './components/SubprocessadorFicha'
export { COPY_TRANSPARENCIA, formatarDataPtBr } from './constants/copyTransparencia'
export {
  LISTA_MEDIDA_EM,
  PAIS_POR_MEDIR,
  SUBPROCESSADORES,
  validarEntradaSubprocessador,
  validarSubprocessadores,
} from './constants/subprocessadores'
export type { Subprocessador } from './constants/subprocessadores'
