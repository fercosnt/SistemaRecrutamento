/**
 * Barrel da feature de transparência — as páginas públicas que descrevem o que o
 * sistema faz com dado de candidato.
 *
 * Consumidores: `src/router/routes.tsx` (as duas rotas públicas) e as superfícies onde o
 * `RodapePublico` for montado — sem ele as páginas existem e ninguém as encontra.
 *
 * ⚠ `RodapePublico` está exportado e **ainda não montado em navegação nenhuma**: a
 * montagem é a Task 3 do plano 47-08, atrás do portão de PUBLICAÇÃO do Encarregado.
 *
 * @module features/transparencia
 */
export { PrivacidadePublicaPage } from './components/PrivacidadePublicaPage'
export type {
  FichaRetencao,
  MatrizPublicada,
  PrivacidadePublicaPageProps,
} from './components/PrivacidadePublicaPage'
export { RodapePublico } from './components/RodapePublico'
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
