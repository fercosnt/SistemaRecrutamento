/**
 * Barrel da feature de transparência — as páginas públicas que descrevem o que o
 * sistema faz com dado de candidato.
 *
 * Consumidores: `src/router/routes.tsx` (as duas rotas públicas) e as superfícies onde o
 * `RodapePublico` for montado — sem ele as páginas existem e ninguém as encontra.
 *
 * `RodapePublico` está montado nas CINCO superfícies públicas — `LandingPage`,
 * `VagasPublicasPage`, `VagaDetalhePage`, `SubprocessadoresPage` e
 * `PrivacidadePublicaPage` — desde a liberação do portão de publicação em 2026-08-11.
 * Ele **não** é montado na rota de manifesto, nas rotas de autenticação nem em nenhuma
 * rota interna: essas já têm navegação própria, e o conjunto é asserido em
 * `__tests__/rodapeMontagem.test.tsx` (caso 8), que reprova tanto a falta quanto o excesso.
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
